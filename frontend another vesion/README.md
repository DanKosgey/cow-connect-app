# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/79fcba42-0142-420d-bc67-711c359f1d47

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/79fcba42-0142-420d-bc67-711c359f1d47) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Key Components

### Farmer Dashboard

The Farmer Dashboard component provides a comprehensive overview of a farmer's activities, including collections, earnings, payments, and quality metrics. It features real-time updates via WebSocket connections and interactive data visualizations.

Key features:
- Real-time data updates via WebSocket
- Interactive charts for quality trends and collection volumes
- Summary cards for key metrics
- Recent collections display
- Upcoming payments tracking
- Responsive design for all device sizes
- Loading states and error handling

For detailed documentation, see:
- [Farmer Dashboard README](src/components/farmer/README.md)
- [Farmer Dashboard Usage Guide](src/components/farmer/USAGE.md)

### Milk Collection Recording

The CollectionForm component provides a comprehensive interface for recording milk collections with GPS location integration, quality parameter validation, and offline support.

Key features:
- GPS location capture with accuracy indicators
- Form validation for all collection parameters
- Photo upload with camera integration
- Offline support with IndexedDB storage
- Real-time validation and feedback
- Responsive design for mobile and desktop
- Quality parameter validation against dairy industry standards

For detailed documentation, see:
- [Collection Recording README](src/components/collections/README.md)

## Testing

This project includes a comprehensive testing suite for all portals:

- Unit tests for components
- Login tests for Admin, Staff, and Farmer portals
- Integration tests for frontend-backend communication
- Health checks for system verification

### Running Tests

```sh
# Run unit tests
npm test

# Run login tests
npm run test:login

# Run tests in watch mode
npm run test:watch

# Run health checks
node health-check.js
```

For detailed testing instructions, see [LOGIN_TESTING.md](LOGIN_TESTING.md) and [TESTING_SUITE.md](TESTING_SUITE.md).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/79fcba42-0142-420d-bc67-711c359f1d47) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)