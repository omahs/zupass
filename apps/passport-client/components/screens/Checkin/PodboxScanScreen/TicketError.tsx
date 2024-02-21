import { GenericIssuanceCheckInError } from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { loadUsingLaserScanner } from "../../../../src/localstorage";
import {
  ErrorContainer,
  ErrorTitle,
  Home,
  ScanAnotherTicket,
  Spread
} from "./GenericIssuanceCheckIn";

export function TicketErrorContent({
  error
}: {
  error: GenericIssuanceCheckInError;
}): JSX.Element {
  let errorContent = null;

  switch (error.name) {
    case "AlreadyCheckedIn":
      errorContent = (
        <>
          <ErrorTitle>Already checked in</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Checked in at</span>
            <span>{new Date(error.checkinTimestamp).toLocaleString()}</span>
          </Spread>
          <Spread>
            <span>Checked in by</span>
            <span>{error.checker}</span>
          </Spread>
        </>
      );
      break;
    case "InvalidSignature":
      errorContent = (
        <>
          <ErrorTitle>Invalid Ticket Signature</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket was not issued by Zupass.</span>
        </>
      );
      break;
    case "InvalidTicket":
      errorContent = (
        <>
          <ErrorTitle>Invalid ticket</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket is invalid.</span>
        </>
      );
      break;
    case "NotSuperuser":
      errorContent = (
        <>
          <ErrorTitle>Not authorized</ErrorTitle>
          <Spacer h={8} />
          <div>{error.detailedMessage}</div>
        </>
      );
      break;
    case "ServerError":
      errorContent = (
        <>
          <ErrorTitle>Network Error</ErrorTitle>
          <Spacer h={8} />
          <span>please try again</span>
        </>
      );
      break;
    case "TicketRevoked":
      errorContent = (
        <>
          <ErrorTitle>This ticket was revoked</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Revoked at</span>
            <span>{error.revokedTimestamp}</span>
          </Spread>
        </>
      );
      break;
  }

  return <ErrorContainer>{errorContent}</ErrorContainer>;
}

function TicketError({
  error
}: {
  error: GenericIssuanceCheckInError;
}): JSX.Element {
  const usingLaserScanner = loadUsingLaserScanner();
  return (
    <>
      <TicketErrorContent error={error} />
      <div
        style={{
          marginTop: "16px",
          width: "100%"
        }}
      >
        <ScanAnotherTicket />
        {!usingLaserScanner && <Home />}
      </div>
    </>
  );
}
