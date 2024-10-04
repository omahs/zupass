import IframeResizer from "iframe-resizer-react";
import React, { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useEmbeddedScreenState } from "../../../src/appHooks";
import { ListenMode, useZappServer } from "../../../src/zapp/useZappServer";
import { AdhocModal } from "../../modals/AdhocModal";
import { EmbeddedScreen } from "../EmbeddedScreens/EmbeddedScreen";

export function ZappScreen({ url }: { url: string }): ReactNode {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q");
  const urlWithOptionalParameter = new URL(url);
  if (queryParam) {
    urlWithOptionalParameter.searchParams.set("q", queryParam);
  }

  return (
    <>
      <ZappModal />
      <IframeResizer
        rel="preload"
        style={{
          // NB: Using min-width to set the width of the iFrame, works around an issue in iOS that can prevent the iFrame from sizing correctly.
          width: "1px",
          minWidth: "calc(100% - 16px)",
          borderRadius: "12px",
          margin: "0 8px"
        }}
        src={urlWithOptionalParameter.toString()}
        sandbox="allow-downloads allow-same-origin allow-scripts allow-popups allow-modals allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
      />
    </>
  );
}

function ZappModal(): ReactNode {
  useZappServer(ListenMode.LISTEN_IF_NOT_EMBEDDED);
  const embeddedScreen = useEmbeddedScreenState();
  const dispatch = useDispatch();
  return (
    <AdhocModal
      open={embeddedScreen?.screen !== undefined}
      onClose={() => {
        dispatch({
          type: "hide-embedded-screen"
        });
      }}
    >
      <EmbeddedScreen />
    </AdhocModal>
  );
}
