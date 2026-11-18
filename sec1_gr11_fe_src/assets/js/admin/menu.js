requireAdmin();

// greet the logged-in admin by username
const me = getUser();
if (me) document.getElementById('welcome').textContent = `Logged in as ${me.sub}`;