import { Row } from "@tanstack/react-table";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { useZmailContext } from "./ZmailContext";
import { ZmailRow } from "./ZmailTable";

export function ZmailRowElement({ row }: { row: Row<ZmailRow> }): ReactNode {
  const ctx = useZmailContext();
  const meta = row.original.meta;

  return (
    <div
      onClick={() => {
        ctx.update({ viewingPCDID: row.original.pcd.id });
      }}
      className="border-b-2 border-gray-200 px-4 py-[0.1em] cursor-pointer hover:bg-gray-100 select-none flex flex-row items-center justify-between whitespace-nowrap"
    >
      <span className={cn("flex-grow pr-2", meta?.viewed ? "" : "font-bold")}>
        {row.original.name}
      </span>
      <span className="pr-2">
        <span className="italic">{row.original.folder}</span>
        {" · "}
        {row.original.type}
        {" · "}
        <span>{meta?.updatedTimestamp ?? "n/a"}</span>
      </span>
    </div>
  );
}
