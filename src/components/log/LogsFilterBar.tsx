import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogsFilterBarProps {
  entityType: string;
  setEntityType: (type: string) => void;
  action: string;
  setAction: (action: string) => void;
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const LogsFilterBar = ({
  entityType,
  setEntityType,
  action,
  setAction,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchQuery,
  setSearchQuery,
}: LogsFilterBarProps) => {
  const handleResetFilters = () => {
    setEntityType("all");
    setAction("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-4">
        <Input
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="all">All Entities</option>
          <option value="users">Users</option>
          <option value="joborder">Job Orders</option>
          <option value="applicants">Applicants</option>
          <option value="clients">Clients</option>
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="all">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>
      <div className="flex gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : "Start Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP") : "End Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default LogsFilterBar;
