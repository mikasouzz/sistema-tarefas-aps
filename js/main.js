import { Toast }    from './toast.js';
import { AuthCtrl } from './auth.js';
import { App }      from './app.js';

// Free view controllers
import './controllers/home.js';
import './controllers/free/today.js';
import './controllers/free/schedule.js';
import './controllers/free/demands.js';

// Admin view controllers
import './controllers/admin/team.js';
import './controllers/admin/calendar.js';
import './controllers/admin/history.js';
import './controllers/admin/bank.js';

window.onload = () => App.init();
