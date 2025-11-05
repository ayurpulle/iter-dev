import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { importAyurGoogleSearchData, importAyurGoogleSearchData2 } from '@/utils/importAyurData';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export function ImportAyurDataButton() {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result1 = await importAyurGoogleSearchData();
      const result2 = await importAyurGoogleSearchData2();
      const totalSuccess = result1.successCount + result2.successCount;
      const totalErrors = result1.errorCount + result2.errorCount;
      toast({
        title: "Import Complete",
        description: `Successfully imported ${totalSuccess} records. ${totalErrors} errors.`,
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
      {isImporting ? 'Importing...' : 'Import Ayur Google Search Data'}
    </Button>
  );
}
