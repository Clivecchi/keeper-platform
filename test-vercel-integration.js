// Simple test script to verify Vercel integration
const { VercelDomainManagerService } = require('./apps/api/src/services/VercelDomainManagerService.js');

async function testVercelIntegration() {
  try {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    
    if (!token || !projectId) {
      console.error('❌ Vercel configuration missing');
      console.log('Required environment variables:');
      console.log('- VERCEL_TOKEN');
      console.log('- VERCEL_PROJECT_ID');
      console.log('- VERCEL_TEAM_ID (optional)');
      return;
    }
    
    console.log('✅ Vercel configuration found');
    console.log(`Project ID: ${projectId}`);
    console.log(`Team ID: ${process.env.VERCEL_TEAM_ID || 'Not set'}`);
    
    const service = new VercelDomainManagerService(token, projectId);
    
    // Test domain status check
    console.log('\n🔍 Testing domain status check...');
    const testDomain = 'example.com'; // Replace with an actual domain you have
    const status = await service.getDomainStatus(testDomain);
    
    console.log('Domain status result:', status);
    
    if (status.attached) {
      console.log('✅ Domain is attached to project');
      
      // Test domain config
      console.log('\n🔧 Testing domain configuration...');
      const config = await service.getDomainConfig(testDomain);
      console.log('Domain config result:', config);
    } else {
      console.log('❌ Domain is not attached to project');
      if (status.error) {
        console.log('Error details:', status.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testVercelIntegration(); 