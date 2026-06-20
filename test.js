const fs = require('fs');
try {
  const code = fs.readFileSync('web/frontend/src/pages/student/StudentEvents.jsx', 'utf8');
  console.log("No syntax error check possible without parser, but let's see if there are undefined vars.");
} catch(e) {
  console.log(e);
}
