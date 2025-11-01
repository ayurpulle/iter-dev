import { supabase } from '@/integrations/supabase/client';

const SHREYAS_USER_ID = 'db6e8fbb-6904-4611-85c8-b424197b896d';

export async function importShreyasYouTubeData() {
  console.log('Starting import of Shreyas YouTube data...');
  
  // Fetch the JSON data
  const response = await fetch('/data/shreyas-youtube-threads-2.json');
  const shreyasThreads = await response.json();
  
  console.log(`Total items to import: ${shreyasThreads.items.length}`);

  try {
    // Insert in batches of 100 to avoid timeout
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < shreyasThreads.items.length; i += batchSize) {
      const batch = shreyasThreads.items.slice(i, i + batchSize);
      
      const itemsToInsert = batch.map((item: any) => ({
        user_id: SHREYAS_USER_ID,
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
        .upsert(itemsToInsert, {
          onConflict: 'user_id,fabric_item_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Error inserting batch starting at index ${i}:`, error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(shreyasThreads.items.length / batchSize)}`);
      }
    }

    console.log(`Import completed. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
