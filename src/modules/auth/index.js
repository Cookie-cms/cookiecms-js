import login from './Singin.js';
import SigninDiscord from './SinginDiscord.js';
import logout from './Logout.js';
import signup from './Singup.js';
import SingupDiscord from './SingupDiscord.js';
import resetPassword from './ForgetPassvc.js';
import validate_code_fp from './ForgetPassconfirm.js';
import updatepass from './ForgetPassupdate.js';
import confirmMail from './ConfirmMail.js';
import finishRegister from './FinishRegister.js';
import generateAuthLink from './discordlink.js';
import discordCallback from './callback.js';
import requestVerificationCode from './Requestvc.js';

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
    generateAuthLink,
    discordCallback,
    validate_code_fp,
    updatepass
};