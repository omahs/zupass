import {
  PipelineDefinition,
  PipelineHistoryEntry,
  PipelineLoadSummary,
  PipelineType
} from "@pcd/passport-interface";
import _ from "lodash";
import { Pool, PoolClient } from "postgres-pool";
import { GenericIssuancePipelineRow } from "../models";
import { sqlQuery, sqlTransaction } from "../sqlQuery";

/**
 * This doesn't follow the general convention we've had so far of queries
 * being functions exported from js modules, but I've done it this way to
 * facilitate simpler prototyping while we figure out what the schemas for
 * stuff should be. I actually kind of like encapsulating stuff like this in
 * interfaces, but it doesn't strictly have to end up that way for production.
 */
export interface IPipelineDefinitionDB {
  loadPipelineDefinitions(): Promise<PipelineDefinition[]>;
  deleteDefinition(pipelineId: string): Promise<void>;
  deleteAllDefinitions(): Promise<void>;
  getDefinition(pipelineId: string): Promise<PipelineDefinition | undefined>;
  upsertDefinition(
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void>;
  upsertDefinitions(definitions: PipelineDefinition[]): Promise<void>;
  saveLoadSummary(
    pipelineId: string,
    lastRunInfo?: PipelineLoadSummary
  ): Promise<void>;
  getLastLoadSummary(
    pipelineId: string
  ): Promise<PipelineLoadSummary | undefined>;
  appendToEditHistory(
    pipelineDefinition: PipelineDefinition,
    editorUserId: string
  ): Promise<void>;
  getEditHistory(
    pipelineId: string,
    maxQuantity?: number
  ): Promise<PipelineHistoryEntry[]>;
}

/**
 * Implements the above interface with the Postgres DB as back-end.
 */
export class PipelineDefinitionDB implements IPipelineDefinitionDB {
  private runInfos: Record<string, PipelineLoadSummary | undefined> = {};

  private db: Pool;

  public constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Gets the last {@link PipelineLoadSummary} from an in-memory store for the
   * {@link Pipeline} identified by the @param pipelineId.
   */
  public async getLastLoadSummary(
    pipelineId: string
  ): Promise<PipelineLoadSummary | undefined> {
    return this.runInfos[pipelineId];
  }

  /**
   * Saves a {@link PipelineLoadSummary} to in-memory store for a {@link Pipeline}
   * identified by the @param pipelineId.
   */
  public async saveLoadSummary(
    pipelineId: string,
    lastRunInfo: PipelineLoadSummary | undefined
  ): Promise<void> {
    this.runInfos[pipelineId] = lastRunInfo;
  }

  /**
   * Loads all {@link PipelineDefinition}s from the database.
   *
   * @todo use `zod` to ensure these are properly formatted.
   */
  public async loadPipelineDefinitions(): Promise<PipelineDefinition[]> {
    const result = await sqlQuery(
      this.db,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      LEFT JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      GROUP BY p.id`
    );

    return result.rows.map(
      (row: GenericIssuancePipelineRow): PipelineDefinition =>
        ({
          id: row.id,
          ownerUserId: row.owner_user_id,
          editorUserIds: row.editor_user_ids.filter(
            (editorId: unknown) => typeof editorId === "string"
          ),
          type: row.pipeline_type as PipelineType,
          options: row.config,
          timeCreated: row.time_created,
          timeUpdated: row.time_updated
        }) satisfies PipelineDefinition
    );
  }

  /**
   * Deletes all {@link PipelineDefinition} from the database.
   */
  public async deleteAllDefinitions(): Promise<void> {
    await sqlQuery(this.db, "DELETE FROM generic_issuance_pipeline_editors");
    await sqlQuery(this.db, "DELETE FROM generic_issuance_pipelines");
  }

  /**
   * Deletes a particular {@link PipelineDefinition} from the database.
   */
  public async deleteDefinition(pipelineId: string): Promise<void> {
    await sqlTransaction(
      this.db,
      "Delete pipeline definition",
      async (client) => {
        await client.query(
          "DELETE FROM generic_issuance_pipeline_editors WHERE pipeline_id = $1",
          [pipelineId]
        );
        await client.query(
          "DELETE FROM generic_issuance_pipelines WHERE id = $1",
          [pipelineId]
        );
      }
    );
  }

  /**
   * Loads a particular {@link PipelineDefinition} from the database, if one
   * exists.
   *
   * @todo use `zod` to parse this.
   */
  public async getDefinition(
    definitionID: string
  ): Promise<PipelineDefinition | undefined> {
    const result = await sqlQuery(
      this.db,
      `
      SELECT p.*, ARRAY_AGG(e.editor_id) AS editor_user_ids
      FROM generic_issuance_pipelines p
      LEFT JOIN generic_issuance_pipeline_editors e
      ON p.id = e.pipeline_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [definitionID]
    );

    if (result.rowCount === 0) {
      return undefined;
    } else {
      const row: GenericIssuancePipelineRow = result.rows[0];
      return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        editorUserIds: row.editor_user_ids.filter(
          (editorId: unknown) => typeof editorId === "string"
        ),
        type: row.pipeline_type as PipelineType,
        options: row.config,
        timeCreated: row.time_created,
        timeUpdated: row.time_updated
      };
    }
  }

  /**
   * Sets a pipeline definition. This is used to either insert or update a
   * definition. If inserting, the caller is responsible for generating a UUID
   * as the pipeline ID.
   */
  public async upsertDefinition(
    definition: PipelineDefinition,
    editorUserId: string | undefined
  ): Promise<void> {
    await sqlTransaction(
      this.db,
      "Insert or update pipeline definition",
      async (client: PoolClient) => {
        await this.appendToEditHistory(definition, editorUserId);

        const pipeline: GenericIssuancePipelineRow = (
          await client.query(
            `
        INSERT INTO generic_issuance_pipelines (id, owner_user_id, pipeline_type, config) VALUES($1, $2, $3, $4)
        ON CONFLICT(id) DO UPDATE
        SET (owner_user_id, pipeline_type, config, time_updated) = ($2, $3, $4, NOW())
        RETURNING *
        `,
            [
              definition.id,
              definition.ownerUserId,
              definition.type,
              JSON.stringify(definition.options)
            ]
          )
        ).rows[0];

        pipeline.editor_user_ids = (
          await client.query(
            `SELECT editor_id FROM generic_issuance_pipeline_editors WHERE pipeline_id = $1`,
            [definition.id]
          )
        ).rows.map((row) => row.editor_id);

        if (!_.isEqual(pipeline.editor_user_ids, definition.editorUserIds)) {
          const editorsToRemove = _.difference(
            pipeline.editor_user_ids,
            definition.editorUserIds
          );
          const editorsToAdd = _.difference(
            definition.editorUserIds,
            pipeline.editor_user_ids
          );

          if (editorsToRemove.length > 0) {
            await client.query(
              `DELETE FROM generic_issuance_pipeline_editors WHERE editor_id = ANY($1)`,
              [[editorsToRemove]]
            );
          }

          if (editorsToAdd.length > 0) {
            for (const editorId of editorsToAdd) {
              await client.query(
                "INSERT INTO generic_issuance_pipeline_editors (pipeline_id, editor_id) VALUES($1, $2)",
                [pipeline.id, editorId]
              );
            }
          }
        }
      }
    );
  }

  /**
   * Bulk version of {@link upsertDefinition}.
   */
  public async upsertDefinitions(
    definitions: PipelineDefinition[]
  ): Promise<void> {
    for (const definition of definitions) {
      await this.upsertDefinition(definition, undefined);
    }
  }

  // TODO: impelement in postgres
  private historyEntries: Map<string, PipelineHistoryEntry[]> = new Map();
  public async appendToEditHistory(
    pipelineDefinition: PipelineDefinition,
    editorUserId?: string
  ): Promise<void> {
    const list = this.historyEntries.get(pipelineDefinition.id) ?? [];
    this.historyEntries.set(pipelineDefinition.id, list);
    list.push({
      pipeline: pipelineDefinition,
      timeCreated: new Date().toISOString(),
      editorUserId
    } satisfies PipelineHistoryEntry);
  }
  public async getEditHistory(
    pipelineId: string,
    maxQuantity?: number
  ): Promise<PipelineHistoryEntry[]> {
    const list = this.historyEntries.get(pipelineId) ?? [];
    return list.slice(Math.max(0, list.length - (maxQuantity ?? 0)));
  }
}
