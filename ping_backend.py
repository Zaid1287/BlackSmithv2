import requests
import datetime

def ping_backend():
    url = "https://blacksmithv2-1.onrender.com/ping"  # BlackSmith Traders app URL
    
    try:
        print(f"{datetime.datetime.now()}: Pinging {url}")
        response = requests.get(url, timeout=30)
        print(f"Response: {response.status_code}")
        
        if response.status_code == 200:
            print("Backend is alive")
            
            # Optional: Parse response to show app status
            try:
                data = response.json()
                print(f"App status: {data.get('status', 'unknown')}")
                print(f"Uptime: {data.get('uptime', 'unknown')} seconds")
            except:
                pass
                
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    ping_backend()  # Just ping once, then exit