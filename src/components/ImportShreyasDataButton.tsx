import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { importShreyasYouTubeData } from '@/utils/importShreyasData';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export function ImportShreyasDataButton() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importShreyasYouTubeData();
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.successCount} records. ${result.errorCount} errors.`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button 
      onClick={handleImport} 
      disabled={isImporting}
      variant="outline"
      className="gap-2"
    >
      <Upload className="h-4 w-4" />
      {isImporting ? 'Importing...' : 'Import Shreyas YouTube Data'}
    </Button>
  );
}
