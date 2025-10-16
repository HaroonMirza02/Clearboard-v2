import { useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './Home.css'; // Import the stylesheet
function Home() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('cb-animate-in');
        }
      });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.cb-scroll-animate');
    animateElements.forEach((el) => observer.observe(el));

    return () => {
      animateElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="cb-home-page">
      {/* Hero Section - Share Files with Confidence */}
      <section className="cb-hero">
        <div className="cb-hero-content">
        <div className="cb-hero-text">
          <h2 className="cb-hero-secondary-title cb-scroll-animate">
            Your Data, <span className="cb-hero-secondary-highlight">Organized & Secure</span>
          </h2>
          <p className="cb-hero-description cb-scroll-animate">
            Clearboard provides enterprise-grade data repository solutions for modern software teams. Store, manage, and access your data with confidence.
          </p>
        </div>
         
          <div className="cb-hero-actions">
            <a href='/department'><button  className="cb-btn cb-btn-secondary">Get Started</button></a>
            <a href='/about'><button className="cb-btn cb-btn-secondary">Learn More</button></a>
          </div>
        </div>
        
      
      </section>

      {/* Features Section */}
      <section id="features" className="cb-features max">
        <div className="cb-features-header">
          <h2 className="cb-features-title">Everything you need for file management</h2>
          <p className="cb-features-subtitle">Built for teams that demand security, speed, and simplicity</p>
        </div>
        
        <div className="cb-features-grid">
         <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\cloudss.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 80,   // adjust as needed
        height: 100,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'white',// ensures it scales without distortion
        marginLeft:'15px'
      }}
    />
</div>

  <h3 className="cb-feature-title">Centralized Repository</h3>
  <p className="cb-feature-description">
    Store all your data in one secure, accessible location with advanced organization tools.
  </p>
</div>
 <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\backup.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 150,   // adjust as needed
        height: 106,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'transparent',// ensures it scales without distortion
        marginLeft:'1px'
      }}
    />
</div>

            <h3 className="cb-feature-title">Reliable Backup</h3>
            <p className="cb-feature-description">
            Automated backups and disaster recovery to ensure your data is never lost.
            </p>
          </div>

          <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\security.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 80,   // adjust as needed
        height: 50,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'white',// ensures it scales without distortion
        marginLeft:'1px'
      }}
    />
</div>

            <h3 className="cb-feature-title">Enterprise Security</h3>
            <p className="cb-feature-description">
              Bank-level encryption keeps your data safe. Your files are protected at rest and in transit.
            </p>
          </div>

          <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\fast.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 60,   // adjust as needed
        height: 60,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'white',// ensures it scales without distortion
        marginLeft:'13px'
      }}
    />
</div>
            <h3 className="cb-feature-title">Lightning Fast</h3>
            <p className="cb-feature-description">
            Optimized performance ensures quick access to your data whenever you need it.


            </p>
          </div>

          <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\analytics.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 80,   // adjust as needed
        height: 100,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'white',// ensures it scales without distortion
        marginLeft:'1px'
      }}
    />
</div>
            <h3 className="cb-feature-title">Analytics Ready</h3>
            <p className="cb-feature-description">
            Integrated analytics tools to extract insights from your data effortlessly.
            </p>
          </div>

          <div className="cb-feature-card">
  <div className="cb-feature-icon cb-icon-share mb-6">
    <img
      src="\native.gif" // replace with your GIF URL
      alt="Feature Animation"
      style={{
        width: 120,   // adjust as needed
        height: 100,  // keeps 4:3 aspect ratio
        objectFit: 'contain',
        backgroundColor:'white',// ensures it scales without distortion
        marginLeft:'30px'
      }}
    />
</div>
            <h3 className="cb-feature-title">Cloud Native</h3>
            <p className="cb-feature-description">
            Built for the cloud with automatic scaling and global availability.
            </p>
          </div>
        </div>
      </section>



    {/* <section className="cb-ctb">
    <h1 className="cb-hero-title">
            Share Files with <span className="cb-hero-highlight">Confidence</span>
          </h1>
     </section> */}
      {/* Footer */}
      <footer className="cb-footer">
        <div className="cb-footer-content">
          <div className="cb-footer-brand">
            <div className="cb-footer-logo">
            {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="cb-brand-icon">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg> */}
<span style={{ textAlign: 'center', marginLeft: '65px', fontSize: '2rem', fontWeight: '600' }}>ClearBoard</span>
            </div>
            <p className="cb-footer-description">
              Professional file sharing and management for modern teams.
            </p>
          </div>
          
          <div style={{ marginRight: '55px'}} className="cb-footer-links">
            <div className="cb-footer-column">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#security">Security</a></li>
              </ul>
            </div>
            
            <div className="cb-footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            
            <div className="cb-footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="cb-footer-bottom">
          <p>© 2025 ClearBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home


