import { coercions, PODPipelineInputFieldType } from "@pcd/passport-interface";
import * as React from "react";
import {
  CellBase,
  DataEditorComponent,
  DataViewerComponent
} from "react-spreadsheet";

type Cell = CellBase<bigint | string | undefined>;

export const IntegerViewer: DataViewerComponent<Cell> = ({ cell }) => {
  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.Integer](value);

  return (
    <div
      className={`Spreadsheet__data-viewer ${
        parsed.success ? "" : "Spreadsheet__data-viewer--invalid"
      }`}
      style={{ pointerEvents: "none", textAlign: "right" }}
    >
      {cell?.toString()}
    </div>
  );
};

export const IntegerEditor: DataEditorComponent<Cell> = ({
  cell,
  onChange
}) => {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...cell,
        value: event.target.value
      });
    },
    [cell, onChange]
  );

  const value = cell?.value || "";
  const parsed = coercions[PODPipelineInputFieldType.Integer](value);

  return (
    <div className="Spreadsheet__data-editor">
      <input
        autoFocus
        type="number"
        onChange={handleChange}
        value={value.toString()}
        style={{
          textAlign: "right",
          backgroundColor: parsed.success ? "inherit" : "rgb(90, 27, 35, 1)"
        }}
      />
    </div>
  );
};
