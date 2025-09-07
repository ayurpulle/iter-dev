import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const recentSearches: string[] = [];
const suggestedSearches: string[] = [];

const SearchBar = () => {
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Search 'Colombia'" />
        <Button>Cancel</Button>
      </div>
      <div>
        <h3>Recent</h3>
        {recentSearches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent searches</p>
        ) : (
          recentSearches.map((item, idx) => <div key={idx}>{item}</div>)
        )}
        <h3>Suggested</h3>
        {suggestedSearches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No suggestions</p>
        ) : (
          suggestedSearches.map((item, idx) => <div key={idx}>{item} [Follow]</div>)
        )}
      </div>
    </div>
  );
};

export default SearchBar;
