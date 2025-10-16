import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AboutPage.css'; // We'll create this file next

function AboutPage() {
  return (
    <div className="about-container">
      {/* 1. Hero Section */}
      <header className="about-hero">
        <div className="about-hero-content">
          <h1>About ClearBoard</h1>
          <p>We are a passionate team dedicated to building secure, intuitive, and powerful software solutions that solve real-world problems for businesses.</p>
        </div>
      </header>

      {/* 2. Our Mission Section */}
      <section className="about-mission">
        <div className="mission-image-container">
          <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070" alt="Team working collaboratively" />
        </div>
        <div className="mission-text-container">
          <h2>Our Mission</h2>
          <p>Our mission is to empower teams by providing a centralized and reliable platform for file management. We believe that with the right tools, any team can achieve seamless collaboration, enhance productivity, and maintain the highest standards of data security.</p>
        </div>
      </section>

      {/* 3. Our Values Section */}
      <section className="about-values">
        <h2>Our Core Values</h2>
        <div className="values-grid">
          <div className="value-card">
            <h3>🔒 Security First</h3>
            <p>Your data's integrity is our top priority. We build with bank-level encryption and industry-best practices.</p>
          </div>
          <div className="value-card">
            <h3>✨ Simplicity</h3>
            <p>Powerful tools don't have to be complicated. We focus on clean, intuitive user experiences.</p>
          </div>
          <div className="value-card">
            <h3>🚀 Innovation</h3>
            <p>We are constantly exploring new technologies to make our products faster, smarter, and more efficient.</p>
          </div>
        </div>
      </section>
      
      {/* 4. Call to Action */}
      <section className="about-cta">
        <h2>Ready to Streamline Your Workflow?</h2>
        <p>Trust ClearBoard for file management needs.</p>
        <Link to="/department" className="cta-button">Get Started</Link>
      </section>
    </div>
  );
}

export default AboutPage;