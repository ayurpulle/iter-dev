import { supabase } from '@/integrations/supabase/client';
import ayurData from '@/data/ayur-google-searches.json';

const AYUR_USER_ID = '2ef8fb6a-70ac-413a-8d12-ddcfce8193c7';

export async function importAyurGoogleSearchData() {
  console.log('Starting import of Ayur Google search data...');
  console.log(`Total items to import: ${ayurData.items.length}`);

  try {
    // First, delete existing data for this user
    const { error: deleteError } = await supabase
      .from('google_search_raw_threads')
      .delete()
      .eq('user_id', AYUR_USER_ID);

    if (deleteError) {
      console.error('Error deleting existing data:', deleteError);
      throw deleteError;
    }

    console.log('Existing data deleted. Starting insert...');

    // Insert in batches of 100 to avoid timeout
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ayurData.items.length; i += batchSize) {
      const batch = ayurData.items.slice(i, i + batchSize);
      
      const itemsToInsert = batch.map((item: any) => ({
        user_id: AYUR_USER_ID,
        fabric_item_id: item.id,
        provider: item.provider,
        data_type: item.data_type,
        data_subtype: item.data_subtype,
        interaction_type: item.interaction_type,
        preview: item.preview,
        payload: item.payload,
        version: item.version,
        provider_connection_id: item.provider_connection_id,
        asat: item.asat,
        is_pii: item.is_pii,
        is_health_related: item.is_health_related,
        is_pornographic: item.is_pornographic,
        content: item.content,
        details: item.details,
      }));

      const { data, error } = await supabase
        .from('google_search_raw_threads')
        .insert(itemsToInsert);

      if (error) {
        console.error(`Error inserting batch starting at index ${i}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ayurData.items.length / batchSize)}`);
      }
    }

    console.log(`Import completed. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Uncomment to run immediately
// importAyurGoogleSearchData().then(result => {
//   console.log('Final result:', result);
// });
