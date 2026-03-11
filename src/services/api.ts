import { ChatResponse, HealthResponse, RequestType, Citation } from '../types'
import { API_BASE_URL } from '../utils/constants'

// Mock delay to simulate API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class ApiService {
  constructor() {
    // baseUrl available for future real API calls
    void API_BASE_URL
  }

  async healthCheck(): Promise<HealthResponse> {
    // Mock implementation
    await delay(300)
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  }

  async sendChatMessage(
    _message: string,
    requestType: RequestType,
    _sessionId?: string
  ): Promise<ChatResponse> {
    // Mock implementation
    await delay(1500)
    
    // Simulate different responses based on request type
    const mockResponses: Partial<Record<RequestType, { message: string; citations: Citation[] }>> = {
      phishing: {
        message: 'Based on your description, this appears to be a phishing attempt. Here are the key indicators [1]:\n\n1. Suspicious sender email address\n2. Urgent language requesting immediate action\n3. Links to unfamiliar domains\n4. Requests for sensitive information\n\n**Recommended Actions [2]:**\n- Do not click any links\n- Do not provide any personal information\n- Report the email to your security team\n- Delete the email from your inbox',
        citations: [
          {
            id: '1',
            sourceName: 'Security Policy - Phishing Prevention',
            link: '/policy/phishing-prevention',
            section: 'Section 3.2',
            securityClassification: 'CONFIDENTIAL',
            snippet: 'Phishing attempts often use urgent language and request sensitive information. Employees must not click suspicious links or provide credentials via email.'
          },
          {
            id: '2',
            sourceName: 'IT Security Handbook',
            link: '/policy/security-handbook',
            section: 'Chapter 5',
            securityClassification: 'INTERNAL',
            snippet: 'Report suspicious emails to security@company.com. Do not forward the email to untrusted parties.'
          }
        ]
      },
      suspicious_login: {
        message: 'I can help you investigate this suspicious login activity [1]. Here\'s what you should do:\n\n1. Check your recent login history in your account settings\n2. Verify if the login location matches your usual locations\n3. Review any recent password changes\n4. Enable additional security measures if needed\n\nIf the login was not authorized by you, immediately change your password and enable MFA.',
        citations: [
          {
            id: '1',
            sourceName: 'Account Security Guidelines',
            link: '/policy/account-security',
            section: 'Section 2.1',
            securityClassification: 'CONFIDENTIAL',
            snippet: 'Upon suspected unauthorized access, change password immediately and enable MFA. Contact IT support to review login history.'
          }
        ]
      },
      vpn: {
        message: 'For VPN connection issues, try these troubleshooting steps [1]:\n\n1. Verify your VPN credentials are correct\n2. Check your internet connection\n3. Restart the VPN client\n4. Try connecting to a different VPN server\n5. Check if your firewall is blocking the connection\n\nIf problems persist, contact IT support for further assistance.',
        citations: [
          {
            id: '1',
            sourceName: 'VPN Configuration Guide',
            link: '/policy/vpn-config',
            section: 'Troubleshooting',
            securityClassification: 'INTERNAL',
            snippet: 'VPN credentials are issued by IT. Restart the client and try a different server if connection drops.'
          }
        ]
      },
      mfa: {
        message: 'For MFA setup and troubleshooting [1]:\n\n1. Ensure you have access to your registered device\n2. Check that your authenticator app is synced\n3. Verify the time settings on your device are correct\n4. Try using backup codes if available\n5. Contact IT support to reset MFA if needed',
        citations: [
          {
            id: '1',
            sourceName: 'MFA Setup Instructions',
            link: '/policy/mfa-setup',
            section: 'Section 1.3',
            securityClassification: 'INTERNAL',
            snippet: 'Authenticator app must be in sync. Use backup codes if device is unavailable. Contact IT to reset MFA.'
          }
        ]
      },
      endpoint_alert: {
        message: 'For endpoint security alerts [1]:\n\n1. Review the alert details in your security dashboard\n2. Check if the alert is from a known application\n3. Verify if the endpoint device is authorized\n4. Review recent software installations\n5. Run a full system scan if recommended\n\nIf the alert indicates a potential threat, isolate the device and contact security immediately.',
        citations: [
          {
            id: '1',
            sourceName: 'Endpoint Security Policy',
            link: '/policy/endpoint-security',
            section: 'Alert Response',
            securityClassification: 'CONFIDENTIAL',
            snippet: 'Isolate the device if threat is confirmed. Contact security immediately. Do not reconnect until cleared.'
          }
        ]
      }
    }

    const response = mockResponses[requestType] || {
      message: 'I understand your question. Let me help you with that.',
      citations: []
    }

    return {
      message: response.message,
      citations: response.citations,
      status: 'complete'
    }
  }
}

export const apiService = new ApiService()
export default apiService
