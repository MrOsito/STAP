document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
  
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const branch = document.getElementById('branch')?.value;
      const username = document.getElementById('username')?.value;
      const password = document.getElementById('password')?.value;
  
      if (!branch || !username || !password) {
        alert("All fields are required.");
        return;
      }
  
      const fullUsername = `${branch}${username}`;
  
      const poolData = {
        UserPoolId: window.config.userPoolId,
        ClientId: window.config.clientId
      };
        
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: fullUsername,
        Pool: userPool
      });
  
      const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: fullUsername,
        Password: password
      });
  
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (result) => {
          const idToken = result.getIdToken().getJwtToken();
  
          try {
            const profileRes = await fetch("https://members.terrain.scouts.com.au/profiles", {
              headers: { Authorization: idToken }
            });
  
            const profileData = await profileRes.json();
            const profile = profileData.profiles?.[0] || {};
  
            window.userData = {
              username: fullUsername,
              id_token: idToken,
              member_id: profile.member?.id,
              member_name: profile.member?.name,
              unit_id: profile.unit?.id,
              unit_name: profile.unit?.name,
              group_id: profile.group?.id,
              group_name: profile.group?.name
            };
  
            // Optional: store in sessionStorage
            sessionStorage.setItem("userData", JSON.stringify(window.userData));
  
            // Redirect
            window.location.href = "/calendar";
          } catch (err) {
            console.error(err);
            alert("Login succeeded, but profile fetch failed.");
          }
        },
        onFailure: (err) => {
          console.error(err);
          alert("Login failed: " + (err.message || "Unknown error"));
        }
      });
    });
  });
  