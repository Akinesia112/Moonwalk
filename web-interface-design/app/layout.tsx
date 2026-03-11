import { SearchProvider } from './lib/context/SearchContext';
import { ProjectProvider } from './lib/context/ProjectContext';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ProjectProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </ProjectProvider>
      </body>
    </html>
  )
}
