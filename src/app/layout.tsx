import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext'
import GlobalCallbackAlert from '@/components/GlobalCallbackAlert';
import SalesLeadsCallbackAlert from '@/components/SalesLeadsCallbackAlert';
import AdminCloseAllButton from '@/components/AdminCloseAllButton';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMA Workspace",
  description: "AMA Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // style={{width: 'fit-content'}}
      >
        <AuthProvider>
          <GlobalCallbackAlert />
          <SalesLeadsCallbackAlert />
          <AdminCloseAllButton />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
            toastClassName="bg-gray-800/90 text-gray-100"
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
