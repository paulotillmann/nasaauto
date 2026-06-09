const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eiwkmpblwnkfqzwmbpbk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpd2ttcGJsd25rZnF6d21icGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM4MzksImV4cCI6MjA5NjUwOTgzOX0.EDrFuc3l2Z3g9edJqfsuUe5L6FRVWy3ry-PvTvhk-nE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const email = `testuser_${Date.now()}@test.com`;
    const password = 'TestPassword123!';
    
    console.log('Signing up test user:', email);
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    
    if (authError) {
      console.error('Sign up error:', authError.message);
      return;
    }
    
    console.log('Sign up successful. User ID:', authData.user?.id);
    
    // Now insert a test client
    const testName = 'TEST CLIENT ' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('clientes')
      .insert([
        {
          nome: testName,
          endereco: 'TEST STREET',
          whatsapp: '11988888888',
          email: 'initial@email.com'
        }
      ])
      .select();
      
    if (insertError) {
      console.error('Insert error:', insertError);
      return;
    }
    
    console.log('Inserted client record:', insertData);
    const clientId = insertData[0].id;
    
    // Attempt update
    const { data: updateData, error: updateError } = await supabase
      .from('clientes')
      .update({
        nome: testName,
        endereco: 'TEST STREET',
        whatsapp: '11988888888',
        email: 'updated@email.com'
      })
      .eq('id', clientId)
      .select();
      
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Updated client record in DB:', updateData);
    }
    
    // Clean up
    await supabase.from('clientes').delete().eq('id', clientId);
    // Delete user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);
    if (deleteUserError) console.log('Could not delete user (requires admin):', deleteUserError.message);
    
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

check();
