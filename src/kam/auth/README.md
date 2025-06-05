## KAM Authentication Module (`/kam/auth`)

This module is central to Keeper's user authentication processes. It contains the core logic for user sign-up, sign-in, sign-out, and session management. All operations are designed to be secure, robust, and adhere to the architectural principles laid out in the main `/kam/README.md`.

### Core Responsibilities:
- Handling new user registration (`register.ts`)
- Authenticating existing users (`login.ts`)
- Invalidating user sessions on logout (`logout.ts`)
- Managing and retrieving user session information (`session.ts`)

### Key Files:
- `index.ts`: Serves as the main entry point, exporting all public-facing authentication functions.
- `types.ts`: Defines all TypeScript types and Zod schemas specific to this authentication module.
- `register.ts`: Contains `registerUserHandler` for new user sign-ups.
- `login.ts`: Contains `loginUserHandler` for user sign-ins.
- `logout.ts`: Contains `logoutUserHandler` for user sign-outs.
- `session.ts`: Contains `getSessionHandler` and potentially `refreshSessionHandler` for managing user sessions.

### Important Considerations:
- **Security**: Password hashing (using bcryptjs) and secure session token management are paramount (though actual hashing/token generation logic may reside in `/kam/lib`).
- **Validation**: All inputs are validated using Zod schemas defined in `types.ts`.
- **Database Interaction**: Primarily interacts with the `User` model via Prisma Client.
- **Modularity**: Designed to be independent of UI components and specific routing frameworks, exporting only handler logic. 