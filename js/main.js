import { Toast }    from './toast.js';
import { AuthCtrl } from './auth.js';
import { App }      from './app.js';

// Free view controllers
import './controllers/home.js';
import './controllers/changelog.js';
import './controllers/free/today.js';
import './controllers/free/schedule.js';
import './controllers/free/demands.js';
import './controllers/free/ranking.js';
import './controllers/free/game.js';

// Admin view controllers
import './controllers/admin/dashboard.js';
import './controllers/admin/team.js';
import './controllers/admin/calendar.js';
import './controllers/admin/history.js';
import './controllers/admin/bank.js';
import './controllers/admin/notices.js';
import './controllers/admin/backup.js';
import './controllers/admin/requests.js';
import './controllers/admin/agenda.js';

window.onload = () => App.init();
