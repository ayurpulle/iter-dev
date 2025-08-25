import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const mockRecent = ["Johnson -> Colombia"];
const mockSuggested = ["Guatemala"];

const SearchBar = () => {
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Search 'Colombia'" />
        <Button>Cancel</Button>
      </div>
      <div>
        <h3>Recent</h3>
        {mockRecent.map((item, idx) => <div key={idx}>{item}</div>)}
        <h3>Suggested</h3>
        {mockSuggested.map((item, idx) => <div key={idx}>{item} [Follow]</div>)}
      </div>
    </div>
  );
};

export default SearchBar;
