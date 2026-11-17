requireAdmin();   // anyone who isn't an admin goes to the login page

// greet the logged-in admin by username
const me = getUser();
if (me) document.getElementById('welcome').textContent = `Logged in as ${me.sub}`;