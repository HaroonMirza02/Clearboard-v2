import FileUploader from './FileUploader.jsx'
import FileList from './FileList.jsx'

function Dashboard() {
  return (
    <section className="cb-dashboard">
      <h2>Team Dashboard</h2>

      <div className="cb-stats">
        <div className="cb-card">
          <div className="cb-card-title">Total Files</div>
          <div className="cb-card-value">1,257</div>
          <div className="cb-card-sub">+12% from last month</div>
        </div>
        <div className="cb-card">
          <div className="cb-card-title">Storage Used</div>
          <div className="cb-card-value">25.6 GB</div>
          <div className="cb-progress"><span style={{width:'65%'}} /></div>
        </div>
        <div className="cb-card">
          <div className="cb-card-title">Shared Files</div>
          <div className="cb-card-value">312</div>
          <div className="cb-card-sub">24 awaiting approval</div>
        </div>
      </div>

      <div className="cb-section-header">
        <h3>Recent Files</h3>
        <FileUploader />
      </div>
      <FileList />
    </section>
  )
}

export default Dashboard


