import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ItemFolder {
  id: string;
  name: string;
}

interface ItemFolderSelectorProps {
  itemId: string;
  itemType: 'post' | 'trip';
  onSave: (folderId?: string) => void;
  children: React.ReactNode;
}

export function ItemFolderSelector({ itemId, itemType, onSave, children }: ItemFolderSelectorProps) {
  const [folders, setFolders] = useState<ItemFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      fetchFolders();
    }
  }, [isOpen, user]);

  const fetchFolders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('item_folders')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching folders:', error);
      return;
    }

    setFolders(data || []);
  };

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    const { data, error } = await supabase
      .from('item_folders')
      .insert({
        user_id: user.id,
        name: newFolderName.trim()
      })
      .select('id, name')
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
      return;
    }

    setFolders(prev => [...prev, data]);
    setSelectedFolderId(data.id);
    setNewFolderName("");
    setShowCreateFolder(false);
    toast({
      title: "Success",
      description: "Folder created",
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          folder_id: selectedFolderId === "no-folder" ? null : selectedFolderId || null
        });

      if (error) throw error;

      onSave(selectedFolderId === "no-folder" ? undefined : selectedFolderId || undefined);
      setIsOpen(false);
      setSelectedFolderId("");
      
      toast({
        title: "Success",
        description: selectedFolderId && selectedFolderId !== "no-folder" ? `${itemType} saved to folder` : `${itemType} saved to your collection`,
      });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: `Failed to save ${itemType}`,
        variant: "destructive",
      });
    }
  };

  const itemLabel = itemType === 'trip' ? 'Trip' : 'Post';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save {itemLabel} to Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to organize your saved {itemType}s, or save to your main collection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select folder (optional)
            </label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="No folder (save to main collection)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-folder">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!showCreateFolder ? (
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(true)}
              className="w-full"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create New Folder
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              />
              <div className="flex gap-2">
                <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save {itemLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}