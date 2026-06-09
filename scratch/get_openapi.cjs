async function getSpec() {
  const url = 'https://eiwkmpblwnkfqzwmbpbk.supabase.co/rest/v1/';
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpd2ttcGJsd25rZnF6d21icGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM4MzksImV4cCI6MjA5NjUwOTgzOX0.EDrFuc3l2Z3g9edJqfsuUe5L6FRVWy3ry-PvTvhk-nE',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpd2ttcGJsd25rZnF6d21icGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzM4MzksImV4cCI6MjA5NjUwOTgzOX0.EDrFuc3l2Z3g9edJqfsuUe5L6FRVWy3ry-PvTvhk-nE'
  };

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    // Check definition of 'clientes' table
    if (data.definitions && data.definitions.clientes) {
      console.log('Clientes properties:', data.definitions.clientes.properties);
    } else {
      console.log('Definitions found:', Object.keys(data.definitions || {}));
    }
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err.message);
  }
}

getSpec();
