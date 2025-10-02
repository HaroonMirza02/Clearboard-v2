import { useEffect } from 'react';
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
            <button className="cb-btn cb-btn-primary">Get Started Free</button>
            <button className="cb-btn cb-btn-secondary">Learn More</button>
          </div>
        </div>
        
      
      </section>

      {/* Features Section */}
      <section className="cb-features">
        <div className="cb-features-header">
          <h2 className="cb-features-title">Everything you need for file management</h2>
          <p className="cb-features-subtitle">Built for teams that demand security, speed, and simplicity</p>
        </div>
        
        <div className="cb-features-grid">
          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-upload">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,10 12,5 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="5" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <ellipse cx="12" cy="5" rx="9" ry="3" />
  <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
  <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
</svg>
            </div>

            <h3 className="cb-feature-title">Centeralized Repository</h3>
            <p className="cb-feature-description">
            Store all your data in one secure, accessible location with advanced organization tools.
            </p>
          </div>

          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-share">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
</svg>

            </div>
            <h3 className="cb-feature-title">Reliable Backup</h3>
            <p className="cb-feature-description">
            Automated backups and disaster recovery to ensure your data is never lost.
            </p>
          </div>

          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-security">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
</svg>

            </div>
            <h3 className="cb-feature-title">Enterprise Security</h3>
            <p className="cb-feature-description">
              Bank-level encryption keeps your data safe. Your files are protected at rest and in transit.
            </p>
          </div>

          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-collaboration">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
</svg>

            </div>
            <h3 className="cb-feature-title">Lightning Fast</h3>
            <p className="cb-feature-description">
            Optimized performance ensures quick access to your data whenever you need it.


            </p>
          </div>

          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-team">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path d="M3 3v18h18" />
  <rect width="4" height="7" x="7" y="10" rx="1" />
  <rect width="4" height="12" x="15" y="5" rx="1" />
</svg>

            </div>
            <h3 className="cb-feature-title">Analytics Ready</h3>
            <p className="cb-feature-description">
            Integrated analytics tools to extract insights from your data effortlessly.
            </p>
          </div>

          <div className="cb-feature-card">
            <div className="cb-feature-icon cb-icon-access">
              {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="16" r="1" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              <svg xmlns="http://www.w3.org/2000/svg" 
  className="w-6 h-6 text-blue-500"
  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a5 5 0 0 1 0 10Z" />
</svg>

            </div>
            <h3 className="cb-feature-title">Cloud Native</h3>
            <p className="cb-feature-description">
            Built for the cloud with automatic scaling and global availability.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section - Ready to simplify */}
      <section className="cb-cta">
        <div className="cb-cta-content">
          <h2 className="cb-cta-title">
            Ready to simplify your file management?
          </h2>
          <p className="cb-cta-subtitle">
            Join thousands of teams already using ClearBoard to collaborate better.
          </p>
          <div className="cb-cta-actions">
            <button className="cb-btn cb-btn-primary">Start Free Trial</button>
            <button className="cb-btn cb-btn-secondary">Schedule Demo</button>
          </div>
          <p className="cb-cta-note">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
    </section>

    {/* <section className="cb-cta">
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
              <span>ClearBoard</span>
            </div>
            <p className="cb-footer-description">
              Professional file sharing and management for modern teams.
            </p>
          </div>
          
          <div className="cb-footer-links">
            <div className="cb-footer-column">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#enterprise">Enterprise</a></li>
              </ul>
            </div>
            
            <div className="cb-footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            
            <div className="cb-footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="#privacy">Privacy</a></li>
                <li><a href="#terms">Terms</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="cb-footer-bottom">
          <p>© 2024 ClearBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home


