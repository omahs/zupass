import { Pool } from "postgres-pool";
import { RateLimitBucket } from "../models";
import { sqlQuery } from "../sqlQuery";

/**
 * Determines if a rate-limited action should be allowed to proceed.
 *
 * The rate-limiting mechanism here is a "token bucket". The bucket contains a
 * number of "tokens" (the `remaining` value in the rate_limit_buckets table).
 * Clients attempt to consume tokens, and if a token is available then the
 * action is permitted. If no token is available, it is denied.
 *
 * Tokens "refill", allowing the user to perform additional actions over time.
 * For instance, if maxActions is 10, and timePeriod is 86400000 (60 minutes in
 * ms), then tokens refill at a rate of one every 6 minutes.
 *
 * This allows clients to continue to make requests, but only at a limited
 * rate. If the client waits for a whole hour, then 10 tokens will be due,
 * fully replenishing the bucket.
 *
 * Token refills are not performed on a timer, but instead we calculate how
 * many tokens are due to be refilled whenever we process a request, by
 * calculating the difference between the current time and the last time we
 * consumed a token, and adding the appropriate number of tokens.
 *
 * @param client
 * @param actionType The type of action being attempted
 * @param actionId The identifier of this action
 * @param maxActions The maximum number of actions allowed in a time period
 * @param startingActions The number of actions to start the bucket with
 * @param timePeriod The time period in which maxActions are allowed
 * @returns the RateLimitBucket
 */
export async function consumeRateLimitToken(
  client: Pool,
  actionType: string,
  actionId: string,
  startingActions: number,
  maxActions: number,
  timePeriod: number
): Promise<RateLimitBucket> {
  // How long to wait before allowing an additional action?
  const timePerAction = timePeriod / maxActions;
  const now = Date.now();

  // This query does the following:
  // 1) Attempt to insert a new bucket, with a single token having been
  //    consumed from the starting number
  // 2) If the insert failed because the bucket exists already, then we have to
  //    update the bucket
  // 3) Return the bucket state
  //
  // Updates cover two fields:
  // `remaining` needs to be updated to the number of tokens remaining *after*
  // attempting to take a token, accounting for any tokens that are added due
  // to refilling.
  // `last_take` should be updated to the most recent time a token was
  // consumed.
  //
  // `remaining` has some important factors:
  //
  //   LEAST($4,
  // Ensures that by adding tokens we never exceed the maximum for the bucket.
  //
  //   GREATEST(rate_limit_buckets.remaining, 0)
  // We start our calculation with either the current remaining token count, or
  // zero, whichever is higher. The remaining count might be -1 from a previous
  // calculation. Because we're going to subtract 1 again, we turn a -1 into a
  // zero, indicating that zero tokens remain at this point.

  //  + FLOOR(($6 - rate_limit_buckets.last_take) / $5)
  // Work out the difference between now ($6) and the last take, and divide by
  // the period of time necessary for a single token to refill. This tells us
  // how many tokens are due to be refilled. FLOOR() is used to round down.
  //
  //   -1
  // Consume a token.
  //
  // `last_take` is calculated by checking if we consumed a token. We consumed
  // a token if either `remaining` was > 0 when we began the query, or if we
  // have refilled the bucket during this query, which we can determine by
  // checking if the `last_take` date was far enough in the past for this to
  // happen. If either condition applies, set `last_take` to the current time.
  // If neither of these conditions apply, then `last_take` remains unchanged.

  const result = await sqlQuery(
    client,
    `
    INSERT INTO rate_limit_buckets 
    VALUES ($1, $2, $3 - 1, $6)
    ON CONFLICT (action_type, action_id)
    DO UPDATE SET
      remaining = 
        LEAST($4,
          GREATEST(rate_limit_buckets.remaining, 0)
          + FLOOR(($6 - rate_limit_buckets.last_take) / $5))
        - 1,
      last_take = CASE
        WHEN rate_limit_buckets.remaining > 0 OR (($6 - rate_limit_buckets.last_take) >= $5) THEN $6
        ELSE rate_limit_buckets.last_take
      END
    RETURNING *
    `,
    [actionType, actionId, startingActions, maxActions, timePerAction, now]
  );
  return result.rows[0];
}

/**
 * Delete multiple rate limit buckets
 */
export async function pruneRateLimitBuckets(
  client: Pool,
  actionType: string,
  expiryDateMs: number
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM rate_limit_buckets WHERE action_type = $1 AND last_take <= $2`,
    [actionType, expiryDateMs]
  );
}

/**
 * Delete rate limit buckets not of given action types
 */
export async function deleteUnsupportedRateLimitBuckets(
  client: Pool,
  supportedActionTypes: string[]
): Promise<void> {
  await sqlQuery(
    client,
    `DELETE FROM rate_limit_buckets WHERE NOT (action_type = ANY($1))`,
    [supportedActionTypes]
  );
}
