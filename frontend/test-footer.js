const React = require('react');

// Simple test to check if Footer component has syntax errors
try {
  const Footer = require('./src/components/Footer.tsx');
  console.log('Footer component loaded successfully');
} catch (error) {
  console.error('Error loading Footer component:', error);
  process.exit(1);
}