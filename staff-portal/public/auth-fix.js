console.clear();
console.log('🔧 KgBites Auth Quick Fix Tool');
console.log('================================\n');

// Check current auth status
const token = localStorage.getItem('token');
const userType = localStorage.getItem('userType');
const user = localStorage.getItem('user');

console.log('📊 Current Status:');
console.log('  Token:', token ? `${token.substring(0, 20)}... (${token.length} chars)` : '❌ MISSING');
console.log('  User Type:', userType || '❌ MISSING');
console.log('  User Data:', user ? '✅ Present' : '❌ MISSING');
console.log('');

if (!token) {
  console.log('❌ PROBLEM: No authentication token found!');
  console.log('');
  console.log('✅ SOLUTION:');
  console.log('  1. Run: fixAuth()');
  console.log('  2. Login with your credentials');
  console.log('  3. Try again');
  
  window.fixAuth = function() {
    console.log('🧹 Clearing all auth data...');
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Cleared!');
    console.log('🔄 Redirecting to login...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };
  
} else if (token.length < 20) {
  console.log('⚠️ PROBLEM: Token looks invalid (too short)');
  console.log('');
  console.log('✅ SOLUTION: Run fixAuth() to re-login');
  
  window.fixAuth = function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };
  
} else if (userType !== 'staff') {
  console.log('⚠️ PROBLEM: User type is not "staff"');
  console.log('  Current:', userType);
  console.log('  Expected: staff');
  console.log('');
  console.log('✅ SOLUTION: Run fixAuth() to re-login as staff');
  
  window.fixAuth = function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };
  
} else {
  console.log('✅ Everything looks good!');
  console.log('');
  console.log('🧪 Test commands available:');
  console.log('  - testBackend() - Test Django connection');
  console.log('  - testAuth() - Test authentication');
  console.log('  - showToken() - Display full token');
  console.log('  - fixAuth() - Force re-login if issues');
  
  window.testBackend = async function() {
    console.log('🔍 Testing backend connection...');
    try {
      const res = await fetch('http://localhost:8000/api/accounts/staff/profile/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Backend connected!');
        console.log('   User:', data.user?.username);
        console.log('   Full Name:', data.full_name);
        console.log('   Status:', res.status);
      } else {
        console.log('❌ Backend returned error:', res.status);
        if (res.status === 401) {
          console.log('   → Token is invalid/expired');
          console.log('   → Run fixAuth() to re-login');
        }
      }
    } catch (err) {
      console.log('❌ Connection failed:', err.message);
      console.log('   → Is Django running on port 8000?');
    }
  };
  
  window.testAuth = async function() {
    console.log('🔍 Testing authentication...');
    try {
      const res = await fetch('http://localhost:8000/api/orders/otp/code/BZ4130/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', res.status);
      
      if (res.status === 200) {
        console.log('✅ Auth working! Can fetch orders.');
      } else if (res.status === 401) {
        console.log('❌ Auth failed - token invalid');
        console.log('   → Run fixAuth() to re-login');
      } else if (res.status === 404) {
        console.log('⚠️ Auth working but order not found');
        console.log('   → This is normal if order doesn\'t exist');
      } else {
        console.log('⚠️ Unexpected status:', res.status);
      }
    } catch (err) {
      console.log('❌ Connection failed:', err.message);
    }
  };
  
  window.showToken = function() {
    console.log('🔑 Full Token:');
    console.log(token);
  };
  
  window.fixAuth = function() {
    console.log('🧹 Clearing auth and forcing re-login...');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };
}

console.log('');
console.log('================================');
console.log('ℹ️  Paste this script in browser console (F12)');
console.log('ℹ️  Or save as auth-fix.js and run in console');
