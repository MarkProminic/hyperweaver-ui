const HelpSection = () => (
  <div className="card">
    <div className="card-body">
      <h4 className="fs-6 fw-bold mb-3">
        <i className="fas fa-question-circle me-2" />
        <span>Configuration Help</span>
      </h4>

      <div className="small">
        <div className="row g-3">
          <div className="col">
            <p>
              <strong>Apply Methods (Oracle Solaris):</strong>
            </p>
            <ul>
              <li>
                <strong>Runtime Only:</strong> <em>Not supported</em> - Provided for compatibility
                only
              </li>
              <li>
                <strong>Persistent Only:</strong> Saves changes to config file, requires reboot
                (recommended)
              </li>
              <li>
                <strong>Both:</strong> <em>Functions as Persistent Only</em> - Runtime changes
                ignored
              </li>
            </ul>
          </div>
          <div className="col">
            <p>
              <strong>Best Practices:</strong>
            </p>
            <ul>
              <li>Leave fields empty for automatic calculation based on system memory</li>
              <li>Maximum ARC should not exceed 85% of total system memory</li>
              <li>Minimum ARC should be at least 1% of total system memory</li>
              <li>Always validate configuration before applying changes</li>
              <li>Plan maintenance window for reboot after ARC changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default HelpSection;
