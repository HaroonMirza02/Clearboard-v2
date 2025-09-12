import FileUploader from './FileUploader.jsx'

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

      <div className="cb-table">
        <div className="cb-thead">
          <div>Name</div>
          <div>Owner</div>
          <div>Last Modified</div>
          <div>Size</div>
        </div>
        {[
          ['Project Proposal.docx','Sarah Miller','2024-01-15','2.5 MB'],
          ['Meeting Notes.pdf','David Lee','2024-01-10','1.2 MB'],
          ['Design Mockups.png','Emily Chen','2024-01-05','5.8 MB'],
          ['Client Presentation.pptx','Michael Brown','2023-12-20','3.1 MB'],
          ['Team Handbook.pdf','Jessica Wilson','2023-12-15','4.7 MB']
        ].map((row,idx)=> (
          <div className="cb-row" key={idx}>
            {row.map((cell,i)=>(<div key={i}>{cell}</div>))}
          </div>
        ))}
      </div>
    </section>
  )
}

export default Dashboard


