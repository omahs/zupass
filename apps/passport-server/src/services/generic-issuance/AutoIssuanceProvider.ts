import {
  AutoIssuanceOptions,
  ManualTicket,
  MemberCriteria
} from "@pcd/passport-interface";
import { randomUUID } from "@pcd/util";
import { IPipelineConsumerDB } from "../../database/queries/pipelineConsumerDB";
import { PretixAtom } from "./pipelines/PretixPipeline";

export class AutoIssuanceProvider {
  private pipelineId: string;
  private autoIssuanceConfig: AutoIssuanceOptions[];

  public constructor(
    pipelineId: string,
    autoIssuanceConfig: AutoIssuanceOptions[]
  ) {
    this.pipelineId = pipelineId;
    this.autoIssuanceConfig = autoIssuanceConfig;
  }

  public async load(
    consumerDB: IPipelineConsumerDB,
    existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const allConsumers = await consumerDB.loadAll(this.pipelineId);

    for (const consumer of allConsumers) {
      await this.maybeIssueForUser(
        consumer.email,
        existingManualTickets,
        realTickets
      );
    }

    return [];
  }

  public async maybeIssueForUser(
    userEmail: string,
    existingManualTickets: ManualTicket[],
    realTickets: PretixAtom[]
  ): Promise<ManualTicket[]> {
    const userRealTickets = realTickets.filter((t) => t.email === userEmail);
    const userManualTickets = realTickets.filter((t) => t.email === userEmail);
    const newManualTickets: ManualTicket[] = [];

    for (const autoIssuance of this.autoIssuanceConfig) {
      const permissioningRealTicket = userRealTickets.find((t) =>
        ticketMatchesCriteria(t, autoIssuance.memberCriteria)
      );
      const permissioningManualTicket = userManualTickets.find((t) =>
        ticketMatchesCriteria(t, autoIssuance.memberCriteria)
      );

      const matchesIssuanceMembershipCriteria: boolean =
        !!permissioningRealTicket || !!permissioningManualTicket;

      if (!matchesIssuanceMembershipCriteria) {
        continue;
      }

      if (
        !canIssueInThisEpoch(autoIssuance, existingManualTickets, userEmail)
      ) {
        continue;
      }

      const newManualTicket: ManualTicket = {
        attendeeEmail: userEmail,
        attendeeName:
          permissioningRealTicket?.name ??
          permissioningManualTicket?.name ??
          "no name",
        eventId: autoIssuance.eventId,
        productId: autoIssuance.productId,
        id: randomUUID(),
        timeCreated: new Date().toISOString()
      };

      newManualTickets.push(newManualTicket);
    }

    return newManualTickets;
  }
}

function ticketMatchesCriteria(
  t: PretixAtom | ManualTicket,
  criterias: MemberCriteria[]
): boolean {
  return !!criterias.find((c) => {
    if (t.eventId !== c.eventId) {
      return false;
    }
    if (c.productId && c.productId !== t.productId) {
      return false;
    }
    return true;
  });
}

function canIssueInThisEpoch(
  autoIssuance: AutoIssuanceOptions,
  manualTickets: ManualTicket[],
  email: string
): boolean {
  const start = new Date(autoIssuance.schedule.startDate).getTime();
  const end = new Date(autoIssuance.schedule.endDate).getTime();
  const now = Date.now();

  if (now < start || now > end) {
    return false;
  }

  const ticketsForUserInEpoch = manualTickets.filter((t) => {
    if (t.attendeeEmail !== email) {
      return false;
    }

    if (!t.timeCreated) {
      return false;
    }

    return (
      new Date(t.timeCreated).getTime() >=
      now - autoIssuance.schedule.intervalMs
    );
  });

  if (ticketsForUserInEpoch.length !== 0) {
    return false;
  }

  return true;
}
