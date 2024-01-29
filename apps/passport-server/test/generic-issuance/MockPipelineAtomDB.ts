import {
  PipelineAtom,
  PipelineAtomDB
} from "../../src/database/queries/pipelineAtomDB";

/**
 * A mock implementation of {@link PipelineAtomDB} for testing purposes.
 */
export class MockPipelineAtomDB implements PipelineAtomDB {
  public data: {
    [pipelineId: string]: { [atomId: string]: PipelineAtom };
  } = {};

  public async save(pipelineID: string, atoms: PipelineAtom[]): Promise<void> {
    if (!this.data[pipelineID]) {
      this.data[pipelineID] = {};
    }
    atoms.forEach((atom) => {
      this.data[pipelineID][atom.id] = atom;
    });
  }

  public async load(pipelineID: string): Promise<PipelineAtom[]> {
    if (!this.data[pipelineID]) {
      return [];
    }

    return Object.values(this.data[pipelineID]);
  }
}
