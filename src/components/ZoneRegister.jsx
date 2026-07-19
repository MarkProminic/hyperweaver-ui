import axios from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const ZoneRegister = () => {
  const { t } = useTranslation();
  const [frontendhost, setFrontendHost] = useState('');
  const [frontendport, setFrontendPort] = useState('3000');
  const [frontendproto, setFrontendProto] = useState('');

  const [backendhost, setBackendHost] = useState('');
  const [backendport, setBackendPort] = useState('');
  const [backendproto, setBackendProto] = useState('');

  const [backendcode, setBackendCode] = useState('');
  const [frontendcode, setFrontendCode] = useState('');

  const [msg, setMsg] = useState('');

  const navigate = useNavigate();

  // To Protect from Inadverntly destroying the Existing Configs, we Redirect to Login if It's been setup
  //    useEffect(() => {
  //       if ( configData.BACKEND_HOST !== undefined || configData.BACKEND_HOST !== null) {
  //                navigate("/");
  //        }
  //    });

  // If we have not yet been setup, we will send a request to the local API to register a host.
  const Register = async e => {
    e.preventDefault();
    try {
      await axios.post('/api/setup', {
        backendhost,
        backendport,
        backendproto,
        frontendhost,
        frontendport,
        frontendproto,
        backendcode,
        frontendcode,
      });
      navigate('/register');
    } catch (registerErr) {
      if (registerErr.response) {
        setMsg(registerErr.response.data.msg);
      }
    }
  };

  return (
    <section className="min-vh-100 d-flex align-items-center py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <form onSubmit={Register} className="card" autoComplete="off">
              <div className="card-body p-4">
                <div className="row">
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="backendproto">
                        {t('auth.zoneRegister.backendProtocolLabel')}
                      </label>
                      <select
                        className="form-select"
                        id="backendproto"
                        value={backendproto}
                        onChange={e => setBackendProto(e.target.value)}
                      >
                        <option value="http">http</option>
                        <option value="https">https</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="backendhost">
                        {t('auth.zoneRegister.backendAddressLabel')}
                      </label>
                      <input
                        id="backendhost"
                        type="text"
                        className="form-control"
                        placeholder={t('auth.zoneRegister.backendHostPlaceholder')}
                        value={backendhost}
                        onChange={e => setBackendHost(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="backendport">
                        {t('auth.zoneRegister.portLabel')}
                      </label>
                      <input
                        id="backendport"
                        type="text"
                        className="form-control"
                        autoComplete="off"
                        placeholder={t('auth.zoneRegister.portPlaceholder')}
                        value={backendport}
                        onChange={e => setBackendPort(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="backendcode">
                        {t('auth.zoneRegister.backendSecurityCodeLabel')}
                      </label>
                      <input
                        id="backendcode"
                        autoComplete="new-password"
                        className="form-control"
                        type="password"
                        placeholder="******"
                        value={backendcode}
                        onChange={e => setBackendCode(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="frontendproto">
                        {t('auth.zoneRegister.frontendProtocolLabel')}
                      </label>
                      <input
                        id="frontendproto"
                        type="text"
                        className="form-control"
                        placeholder={t('auth.zoneRegister.frontendProtocolPlaceholder')}
                        value={frontendproto}
                        onChange={e => setFrontendProto(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="frontendhost">
                        {t('auth.zoneRegister.frontendAddressLabel')}
                      </label>
                      <input
                        id="frontendhost"
                        type="text"
                        className="form-control"
                        placeholder={t('auth.zoneRegister.frontendHostPlaceholder')}
                        value={frontendhost}
                        onChange={e => setFrontendHost(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="frontendport">
                        {t('auth.zoneRegister.portLabel')}
                      </label>
                      <input
                        id="frontendport"
                        type="text"
                        className="form-control"
                        autoComplete="off"
                        placeholder={t('auth.zoneRegister.portPlaceholder')}
                        value={frontendport}
                        onChange={e => setFrontendPort(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="frontendcode">
                        {t('auth.zoneRegister.frontendSecurityCodeLabel')}
                      </label>
                      <input
                        id="frontendcode"
                        autoComplete="new-password"
                        className="form-control"
                        type="password"
                        placeholder="******"
                        onChange={e => setFrontendCode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-center mt-3">
                  {msg && <p className="mb-2">{msg}</p>}
                  <button type="submit" className="btn btn-primary">
                    {t('auth.zoneRegister.registerBtn')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ZoneRegister;
