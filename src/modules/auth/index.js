import login from './Singin.js';
import SigninDiscord from './SinginDiscord.js';
import logout from './Logout.js';
import signup from './Singup.js';
import SingupDiscord from './SingupDiscord.js';
import resetPassword from './ForgetPass.js';
import requestVerificationCode from './Requestvc.js';
import confirmMail from './ConfirmMail.js';
import finishRegister from './FinishRegister.js';
import generateAuthLink from './discordlink.js';

export default {
    login,
    SigninDiscord,
    logout,
    signup,
    SingupDiscord,
    resetPassword,
    requestVerificationCode,
    confirmMail,
    finishRegister,
    generateAuthLink
};