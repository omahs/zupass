import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLoadedIssuedPCDs } from "../../src/appHooks";
import { Spinner } from "./Spinner";

export function LoadingIssuedPCDs(): JSX.Element | null {
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const [style, setStyle] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadedIssuedPCDs) {
      setLoading(false);
      setStyle({
        // backgroundColor: "rgba(50, 226, 97, 0.8)"
      });
      setTimeout(() => {
        setStyle({
          opacity: 0,
          height: "0px",
          margin: "0px !important",
          marginBottom: "0px",
          fontSize: "0.1em !important",
          padding: "0px"
          // backgroundColor: "rgba(50, 226, 97, 0.8)"
        });
      }, 1500);
    }
  }, [loadedIssuedPCDs]);

  return (
    <Container
      className="w-full text-white rounded-lg font-bold"
      style={{
        ...{
          padding: "8px",
          marginBottom: "0.75rem"
        },
        ...style
      }}
    >
      <Spinner
        text={loadedIssuedPCDs ? "Loaded Tickets" : "Loading Tickets"}
        show={loading}
      />
    </Container>
  );
}

const Container = styled.div`
  user-select: none;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 50px;
  background-color: rgba(0, 0, 0, 0.3);
  font-size: 1em;
  transition: all 200ms ease-in-out;
`;
