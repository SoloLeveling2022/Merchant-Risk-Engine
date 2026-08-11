# Backend Testing Guide

This guide outlines the 40 specific Unit Tests to be implemented across the Stock Insurance Platform backend microservices (excluding the API Gateway and Eureka Server), along with the commands and guidance required to execute them.

## 40 Unit Test Cases Plan

The 40 test cases will be evenly distributed across all 5 of our core business microservices (8 tests each) to ensure critical functionality is validated.

### 1. Identity Service (8 Tests)
**UserService**
1. `shouldRegisterNewUserSuccessfully`: Verifies a new user is saved correctly.
2. `shouldThrowExceptionWhenRegisteringExistingEmail`: Verifies rejection when email is already in use.
3. `shouldFetchUserProfileById`: Verifies correct user details are returned.

**AuthController / UserController**
4. `shouldReturn201OnSuccessfulRegistration`: Verifies HTTP 201 Created on register API.
5. `shouldReturn400OnInvalidRegistrationData`: Verifies HTTP 400 Bad Request on missing fields.
6. `shouldAuthenticateValidUser`: Verifies token generation for valid credentials.
7. `shouldReturn200OnSuccessfulLogin`: Verifies HTTP 200 OK and token presence in response.
8. `shouldReturn401OnUnauthorizedAccess`: Verifies HTTP 401 Unauthorized for invalid login.

### 2. Insurance Core Service (8 Tests)
**PolicyService**
9. `shouldCreateNewPolicySuccessfully`: Verifies a policy is correctly assigned to a user/portfolio.
10. `shouldCalculateCorrectPremiumAmount`: Verifies premium math logic based on risk factors.
11. `shouldActivatePolicySuccessfully`: Verifies status changes to ACTIVE.
12. `shouldCancelPolicyAndCalculateRefund`: Verifies cancellation logic and prorated refund.

**PolicyController**
13. `shouldReturn201OnPolicyCreation`: Verifies HTTP 201 Created on create API.
14. `shouldReturn200WithPolicyDetails`: Verifies HTTP 200 OK when fetching policy by ID.
15. `shouldReturn404ForUnknownPolicyId`: Verifies HTTP 404 Not Found for invalid policy.
16. `shouldReturn200OnPolicyCancellation`: Verifies HTTP 200 OK when a policy is canceled.

### 3. Portfolio Market Service (8 Tests)
**PortfolioService**
17. `shouldCreatePortfolioForUser`: Verifies portfolio initialization.
18. `shouldAddStockToPortfolio`: Verifies stock addition and quantity updates.
19. `shouldCalculateTotalPortfolioValue`: Verifies value aggregation based on current stock prices.
20. `shouldThrowExceptionWhenSellingUnownedStock`: Verifies rejection of invalid sell orders.

**MarketService / PortfolioController**
21. `shouldFetchCurrentStockPrice`: Verifies external/internal market price retrieval.
22. `shouldReturn201OnPortfolioCreation`: Verifies HTTP 201 Created on portfolio setup.
23. `shouldReturn200OnStockPurchase`: Verifies HTTP 200 OK on buy order API.
24. `shouldReturn400OnInsufficientFunds`: Verifies HTTP 400 Bad Request on failed buy order.

### 4. Claims Finance Service (8 Tests)
**ClaimService**
25. `shouldFileNewClaimSuccessfully`: Verifies a claim is logged as PENDING.
26. `shouldApproveClaimAndTriggerPayout`: Verifies approval changes status and initiates transfer.
27. `shouldRejectClaimWithReason`: Verifies rejection flow and status update.
28. `shouldCalculateCorrectPayoutAmount`: Verifies payout math against policy limits.

**ClaimController**
29. `shouldReturn201OnFileClaim`: Verifies HTTP 201 Created on claim filing API.
30. `shouldReturn200OnClaimApproval`: Verifies HTTP 200 OK on admin approve API.
31. `shouldReturn404ForUnknownClaim`: Verifies HTTP 404 Not Found on invalid claim ID.
32. `shouldReturn400IfClaimAlreadyProcessed`: Verifies HTTP 400 Bad Request on duplicate processing.

### 5. Platform Ops Service (8 Tests)
**AuditLogService / NotificationService**
33. `shouldLogSystemEventSuccessfully`: Verifies admin audit logs are recorded.
34. `shouldFetchAuditLogsByDateRange`: Verifies filtering of audit logs.
35. `shouldTriggerEmailNotification`: Verifies notification trigger logic for alerts.
36. `shouldUpdateSystemConfiguration`: Verifies dynamic config update logic.

**AdminController / OpsController**
37. `shouldReturn200OnSystemHealthCheck`: Verifies HTTP 200 OK on custom health endpoints.
38. `shouldReturn200WhenFetchingAuditLogs`: Verifies HTTP 200 OK on logs API.
39. `shouldReturn200OnConfigurationUpdate`: Verifies HTTP 200 OK on config update API.
40. `shouldReturn403ForNonAdminAccess`: Verifies HTTP 403 Forbidden when standard user accesses ops APIs.

---

## Running the Tests

You can run the tests using Maven from your terminal or command prompt.

### 1. Run all 40 tests for the entire backend
To run every test across all microservices at once, navigate to the root backend directory:
```bash
cd backend
mvn clean test
```

### 2. Run tests for a specific microservice
To run the 8 tests associated with a specific service (e.g., `platform-ops-service`):
```bash
cd backend/microservices/platform-ops-service
mvn clean test
```

### 3. Run a specific test class
If you want to run only the tests inside `UserServiceTest`:
```bash
mvn test -Dtest="UserServiceTest"
```

### 4. Run a specific individual test method
If you want to run a single test like `shouldRegisterNewUserSuccessfully`:
```bash
mvn test -Dtest="UserServiceTest#shouldRegisterNewUserSuccessfully"
```
