import TripPlanning from "@/components/TripPlanning";
import TopBar from "@/components/TopBar";
import BottomTabBar from "@/components/BottomTabBar";

const Search = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex-1 overflow-y-auto">
        <TripPlanning />
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Search;