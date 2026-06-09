const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eiwkmpblwnkfqzwmbpbk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpd2ttcGJsd25rZnF6d21icGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM4MzksImV4cCI6MjA5NjUwOTgzOX0.EDrFuc3l2Z3g9edJqfsuUe5L6FRVWy3ry-PvTvhk-nE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    // We can run an RPC or raw query to get table columns, or query postgres schema tables using supabase REST client if we have a function.
    // Wait, let's check if we can call a function or try to perform a dummy insert/update and see if it fails or doesn't persist the email.
    // Let's create a client record first:
    const tempName = 'TEST CLIENT ' + Date.now();
    const insertResult = await supabase
      .from('clientes')
      .insert([
        {
          nome: tempName,
          endereco: 'TEST ENDERECO',
          whatsapp: '11999999999',
          email: 'test@email.com'
        }
      ])
      .select();

    console.log('Insert result:', insertResult);

    if (insertResult.data && insertResult.data.length > 0) {
      const createdId = insertResult.data[0].id;
      console.log('Inserted email:', insertResult.data[0].email);

      // Now attempt to update the email:
      const updateResult = await supabase
        .from('clientes')
        .update({
          nome: tempName,
          endereco: 'TEST ENDERECO',
          whatsapp: '11999999999',
          email: 'updated@email.com'
        })
        .eq('id', createdId)
        .select();

      console.log('Update result:', updateResult);

      // Clean up
      await supabase.from('clientes').delete().eq('id', createdId);
    }
  } catch (err) {
    console.log('Exception:', err.message);
  }
}

check();
