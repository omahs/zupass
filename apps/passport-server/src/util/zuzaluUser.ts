import { ZupassUserJson } from "@pcd/passport-interface";
import _ from "lodash";
import { UserRow, ZuzaluPretixTicket } from "../database/models";

/**
 * Sometimes the ticket we load from pretix is updated.
 * This function detects these changes.
 */
export function pretixTicketsDifferent(
  oldTicket: ZuzaluPretixTicket,
  newTicket: ZuzaluPretixTicket
): boolean {
  if (oldTicket.role !== newTicket.role) {
    return true;
  }

  if (
    !_.isEqual(oldTicket.visitor_date_ranges, newTicket.visitor_date_ranges)
  ) {
    return true;
  }

  if (oldTicket.name !== newTicket.name) {
    return true;
  }

  return false;
}

/**
 * Converts list of users to map indexed by email address.
 */
export function ticketsToMapByEmail(
  users: ZuzaluPretixTicket[]
): Map<string, ZuzaluPretixTicket> {
  return new Map(users.map((user) => [user.email, user]));
}

/**
 * Converts UserRow from database into ZupassUserJson to be returned from API.
 */
export function userRowToZupassUserJson(user: UserRow): ZupassUserJson {
  return {
    uuid: user.uuid,
    commitment: user.commitment,
    email: user.email,
    salt: user.salt
  };
}
