import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Dispatch, SetStateAction } from "react";
import { LoginCategory } from "../../types";
import { LoginGroup } from "./LoginWidget";

/**
 * Allows a user that is logging in to choose:
 * - which event they want to log in for
 * - which group in the event they want to log in as
 * @todo create some better ux for logging in.
 */
export function SelectLoginGroup({
  selectedGroup,
  setSelectedGroup,
  groups
}: {
  selectedGroup: LoginCategory | undefined;
  setSelectedGroup: Dispatch<SetStateAction<LoginCategory | undefined>>;
  groups: LoginGroup[];
}) {
  return (
    <Select
      value={selectedGroup}
      onValueChange={(v) => setSelectedGroup(v as LoginCategory)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select your Event" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {groups.map((g) => {
            return (
              <SelectItem key={g.groupId} value={g.groupId}>
                {g.groupId}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
