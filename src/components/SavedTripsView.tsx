import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, DollarSign, Trash2, Eye, Edit, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useSavedItineraries, SavedItinerary } from "@/hooks/useSavedItineraries";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StructuredItinerary } from "./StructuredItinerary";
import { UnifiedItineraryShareDialog } from "./UnifiedItineraryShareDialog";

interface SavedTripsViewProps {
  onBack: () => void;
  onViewIter: (iter: any) => void;
  onEditIter: (iter: any) => void;
}

const SavedTripsView = ({ onBack, onViewIter, onEditIter }: SavedTripsViewProps) => {
  const { savedItineraries, loading, deleteItinerary } = useSavedItineraries();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteItinerary(id);
    setDeletingId(null);
  };

  const getBudgetDisplay = (budget: number | null) => {
    if (!budget) return "Not set";
    return "$".repeat(budget);
  };

  const getBudgetDescription = (budget: number | null) => {
    const descriptions = {
      1: "Budget-friendly",
      2: "Moderate", 
      3: "Comfortable",
      4: "Luxury",
      5: "Ultra-luxury"
    };
    return budget ? descriptions[budget as keyof typeof descriptions] || "" : "";
  };

  if (loading) {
    return (
      <div className="px-4 py-6 pb-24 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Saved Trips</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Trips</h1>
          <p className="text-muted-foreground text-sm">{savedItineraries.length} saved iters</p>
        </div>
      </div>

      {savedItineraries.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-muted-foreground">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No saved trips yet</h3>
              <p className="text-sm">Start planning your first trip to save iters here!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {savedItineraries.map((itinerary) => (
            <Card key={itinerary.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg font-semibold truncate">
                        {itinerary.title}
                      </CardTitle>
                      {!itinerary.is_owner && (
                        <Badge variant="outline" className="text-xs">
                          by @{itinerary.creator_username}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {itinerary.destination}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <UnifiedItineraryShareDialog 
                      itineraryId={itinerary.id}
                      itineraryTitle={itinerary.title}
                      isOwner={itinerary.is_owner}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewIter(itinerary)}
                      className="p-2"
                      title="View itinerary"
                    >
                      <Eye size={16} />
                    </Button>
                    {(() => {
                      const canEdit = itinerary.is_owner || itinerary.can_edit;
                      console.log(`Itinerary ${itinerary.title}: is_owner=${itinerary.is_owner}, can_edit=${itinerary.can_edit}, showEdit=${canEdit}`);
                      return canEdit;
                    })() && (
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           console.log('Edit button clicked for itinerary:', itinerary.title);
                           console.log('Calling onEditIter with:', itinerary);
                           onEditIter(itinerary);
                         }}
                         className="p-2"
                         title="Edit itinerary"
                       >
                         <Edit size={16} />
                       </Button>
                    )}
                    {itinerary.is_owner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-destructive hover:text-destructive"
                            disabled={deletingId === itinerary.id}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Iter</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{itinerary.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(itinerary.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {(itinerary.start_date || itinerary.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      <span>
                        {itinerary.start_date && itinerary.end_date
                          ? `${format(new Date(itinerary.start_date), "MMM d")} - ${format(new Date(itinerary.end_date), "MMM d")}`
                          : itinerary.start_date
                          ? `From ${format(new Date(itinerary.start_date), "MMM d, yyyy")}`
                          : `Until ${format(new Date(itinerary.end_date!), "MMM d, yyyy")}`
                        }
                      </span>
                    </div>
                  )}
                  
                  {itinerary.budget && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign size={14} />
                      <span>{getBudgetDisplay(itinerary.budget)} - {getBudgetDescription(itinerary.budget)}</span>
                    </div>
                  )}

                  {itinerary.interests && itinerary.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {itinerary.interests.slice(0, 3).map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {itinerary.interests.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{itinerary.interests.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Saved {format(new Date(itinerary.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedTripsView;