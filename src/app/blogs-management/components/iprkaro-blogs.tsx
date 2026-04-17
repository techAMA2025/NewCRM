'use client'
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faChartLine, faClipboardList, faCog, faPlus, faEdit, faTrash, faUpload, faMagic, faImage } from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, storage } from '@/firebase/iprkaro'; // adjust the path as needed
import { useRouter } from 'next/navigation'; 
import dynamic from 'next/dynamic';

// Dynamically import Tiptap editor with client-side rendering only
const TiptapEditor = dynamic(() => import('./TiptapEditoripr'), { 
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

// Define FAQ interface
interface FAQ {
  id?: string;
  question: string;
  answer: string;
}

// Define Review interface
interface Review {
  id?: string;
  name: string;
  rating: number; // 1-5
  review: string;
  date?: string;
}

// Define Blog interface with updated structure
interface Blog {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  image: string;
  created: number;
  metaTitle?: string;
  metaDescription?: string;
  slug: string; // New slug field for URLs
  faqs?: FAQ[]; // New field for FAQs
  reviews?: Review[]; // New field for Reviews
  author: string; // New author field
}

const BlogsDashboard = () => {
  const [activeTab, setActiveTab] = useState('blogs');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [newBlog, setNewBlog] = useState<Blog>({
    title: '',
    subtitle: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    image: '',
    created: Date.now(),
    metaTitle: '',
    metaDescription: '',
    slug: '', // Initialize the slug field
    faqs: [], // Initialize empty FAQs array
    reviews: [], // Initialize empty Reviews array
    author: 'Anuj Anand Malik' // Default author changed from 'Team AMA'
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Set the number of items per page
  const [rssDebugInfo, setRssDebugInfo] = useState<string>('');
  const [isLoadingRss, setIsLoadingRss] = useState(false);

  // AI Generation state
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeyword, setSecondaryKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [expansionSubtopics, setExpansionSubtopics] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);

  // Calculate the total number of pages
  const totalPages = Math.ceil(blogs.length / itemsPerPage);

  // Get the current blogs to display based on the current page
  const currentBlogs = blogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Authentication checked by parent hub.

  // Logout handler using Firebase Auth
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/nullify');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Navigation handler: Redirect for Blogs and Articles
  const handleNavigation = (itemId: string) => {
    if (itemId === 'blogs') {
      router.push('/authority/blogs');
    } else if (itemId === 'articles') {
      router.push('/authority/blogs'); // Articles are likely part of blogs
    } else if (itemId === 'home') {
      router.push('/authority/leads');
    } else if (itemId === 'users') {
      router.push('/authority/user-management');
    } else if (itemId === 'amalive') {
      router.push('/authority/leads'); // Defaulting to leads
    } else {
      setActiveTab(itemId);
    }
  };

  // Fetch blogs data
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'blogs'));
        const data = querySnapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            title: docData.title || '',
            subtitle: docData.subtitle || '',
            description: docData.description || '',
            date: docData.date || '',
            image: docData.image || '',
            created: docData.created || Date.now(),
            metaTitle: docData.metaTitle || '',
            metaDescription: docData.metaDescription || '',
            slug: docData.slug || '',
            faqs: docData.faqs || [],
            reviews: docData.reviews || [],
            author: docData.author || 'Anuj Anand Malik'
          };
        });
        // Sort blogs by date in descending order (newest first)
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        setBlogs(sortedData);
      } catch (error) {
        console.error("Error fetching blogs data:", error);
      }
    };

    fetchBlogs();
  }, []);

  // --- Draft Persistence Logic ---
  const DRAFT_STORAGE_KEY = 'blog_draft';

  // Load draft on mount (only for 'add' mode)
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const { blog, primary, secondary, image } = JSON.parse(savedDraft);
        if (blog) {
          // We don't automatically set the form because we might be in 'edit' mode.
          // Drafts are intended for NEW blogs.
          console.log('Draft found in storage');
        }
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, []);

  // Auto-save draft when form changes
  useEffect(() => {
    // Only save draft if in 'add' mode and form is visible and has content
    if (showBlogForm && formMode === 'add') {
      const hasContent = newBlog.title || newBlog.description || primaryKeyword || imagePrompt;
      if (hasContent) {
        const draft = {
          blog: newBlog,
          primary: primaryKeyword,
          secondary: secondaryKeyword,
          image: imagePrompt,
          expansion: expansionSubtopics
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
    }
  }, [newBlog, primaryKeyword, secondaryKeyword, imagePrompt, expansionSubtopics, showBlogForm, formMode]);

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const { blog, primary, secondary, image, expansion } = JSON.parse(savedDraft);
        setNewBlog(blog);
        setPrimaryKeyword(primary || '');
        setSecondaryKeyword(secondary || '');
        setImagePrompt(image || '');
        setExpansionSubtopics(expansion || '');
        if (blog.image) {
          setImagePreview(blog.image);
        }
        return true;
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
    return false;
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };
  // --- End Draft Persistence Logic ---

  // Handle animation sequence
  // useEffect(() => {
  //   // Start with black screen
  //   const welcomeTimer = setTimeout(() => {
  //     setAnimationState('welcome'); // Show Hello Anuj Bhiya

  //     // After showing welcome, transition to dashboard
  //     const dashboardTimer = setTimeout(() => {
  //       setAnimationState('dashboard');
  //     }, 1500); // 1.5 seconds as requested

  //     return () => clearTimeout(dashboardTimer);
  //   }, 500);

  //   return () => clearTimeout(welcomeTimer);
  // }, []);

  // Add a helper function to generate slug from title
  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .trim(); // Trim spaces from start and end
  };

  // Handle blog form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBlog(prevState => {
      // If title field is changed, auto-generate slug (only if slug is empty or user hasn't modified it)
      if (name === 'title' && (!prevState.slug || prevState.slug === generateSlug(prevState.title))) {
        return {
          ...prevState,
          [name]: value,
          slug: generateSlug(value)
        };
      }
      return {
        ...prevState,
        [name]: value
      };
    });
  };

  // Handle Tiptap editor content changes
  const handleEditorChange = (content: string) => {
    setNewBlog(prevState => ({
      ...prevState,
      description: content
    }));
  };

  // Add FAQ to the blog
  const addFaq = () => {
    setNewBlog(prevState => ({
      ...prevState,
      faqs: [...(prevState.faqs || []), { question: '', answer: '' }]
    }));
  };

  // Remove FAQ from the blog
  const removeFaq = (index: number) => {
    setNewBlog(prevState => ({
      ...prevState,
      faqs: (prevState.faqs || []).filter((_, i) => i !== index)
    }));
  };

  // Handle FAQ input changes
  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setNewBlog(prevState => {
      const updatedFaqs = [...(prevState.faqs || [])];
      updatedFaqs[index] = { 
        ...updatedFaqs[index], 
        [field]: value 
      };
      return {
        ...prevState,
        faqs: updatedFaqs
      };
    });
  };

  // Add Review to the blog
  const addReview = () => {
    setNewBlog(prevState => ({
      ...prevState,
      reviews: [...(prevState.reviews || []), { name: '', rating: 5, review: '', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  // Remove Review from the blog
  const removeReview = (index: number) => {
    setNewBlog(prevState => ({
      ...prevState,
      reviews: (prevState.reviews || []).filter((_, i) => i !== index)
    }));
  };

  // Handle Review input changes
  const handleReviewChange = (index: number, field: keyof Review, value: string | number) => {
    setNewBlog(prevState => {
      const updatedReviews = [...(prevState.reviews || [])];
      updatedReviews[index] = { 
        ...updatedReviews[index], 
        [field]: value 
      };
      return {
        ...prevState,
        reviews: updatedReviews
      };
    });
  };

  // Handle file upload to Firebase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 2MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      alert("Image is too large. Maximum size is 10MB.");
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `blog-images/${Date.now()}_${file.name}`);
      
      // Create a local preview of the image
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Compress the image before uploading if it's an image
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      
      // Upload with retry logic
      const maxRetries = 3;
      let retryCount = 0;
      let uploadSuccessful = false;
      
      while (retryCount < maxRetries && !uploadSuccessful) {
        try {
          // Upload the file
          const snapshot = await uploadBytes(storageRef, fileToUpload);
          
          // Get the download URL and update the blog state
          const downloadURL = await getDownloadURL(snapshot.ref);
          setNewBlog(prevState => ({
            ...prevState,
            image: downloadURL
          }));
          
          uploadSuccessful = true;
          setUploadProgress(100);
        } catch (err) {
          console.error(`Upload attempt ${retryCount + 1} failed:`, err);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed after ${maxRetries} attempts: ${err instanceof Error ? err.message : String(err)}`);
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : "Please check your internet connection and try again."}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle AI generation
  const handleGenerate = async () => {
    if (!primaryKeyword.trim()) {
      alert('Please enter a primary keyword.');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch('/api/ipr-karo-blog/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ primaryKeyword, secondaryKeyword }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate blog');
      }

      const generatedData = await response.json();

      setNewBlog(prevState => ({
        ...prevState,
        title: generatedData.title || prevState.title,
        subtitle: generatedData.subtitle || prevState.subtitle,
        description: generatedData.description || prevState.description, // HTML content
        metaTitle: generatedData.metaTitle || prevState.metaTitle,
        metaDescription: generatedData.metaDescription || prevState.metaDescription,
        slug: generatedData.slug || (generatedData.title ? generateSlug(generatedData.title) : prevState.slug),
        faqs: generatedData.faqs || prevState.faqs,
        reviews: generatedData.reviews || prevState.reviews,
      }));
      
      alert('Blog generated successfully! Please review and add an image.');
    } catch (error) {
      console.error('Error generating blog:', error);
      alert('Failed to generate blog. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle AI image generation
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter an image prompt.');
      return;
    }

    try {
      setIsGeneratingImage(true);
      const response = await fetch('/api/ipr-karo-blog/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const { imageUrl } = await response.json();
      
      setNewBlog(prevState => ({
        ...prevState,
        image: imageUrl
      }));
      
      setImagePreview(imageUrl);
      alert('AI image generated successfully!');
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle Description Expansion
  const handleExpandDescription = async () => {
    if (!expansionSubtopics.trim()) {
      alert('Please enter subtopics or instructions for expansion.');
      return;
    }

    if (!newBlog.description.trim()) {
      alert('Cannot expand an empty description. Please generate or write something first.');
      return;
    }

    try {
      setIsExpanding(true);
      const response = await fetch('/api/ipr-karo-blog/expand-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          currentDescription: newBlog.description, 
          expansionSubtopics, 
          primaryKeyword 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to expand description');
      }

      const { expandedDescription } = await response.json();
      
      setNewBlog(prevState => ({
        ...prevState,
        description: expandedDescription
      }));
      
      alert('Description expanded successfully!');
    } catch (error) {
      console.error('Error expanding description:', error);
      alert('Failed to expand description. Please try again.');
    } finally {
      setIsExpanding(false);
    }
  };
  
  // Helper function to compress images
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
              }
              
              // Create a new file from the blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7 // Quality (0.7 = 70%)
          );
        };
        
        img.onerror = () => {
          reject(new Error('Error loading image for compression'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file for compression'));
      };
    });
  };

  // Handle blog form submission (Create or Update)
  const handleSubmitBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Add timestamp and format the date
      const blogWithMetadata = {
        ...newBlog,
        created: formMode === 'add' ? Date.now() : newBlog.created,
        date: new Date(newBlog.date).toISOString().split('T')[0] // Ensure date is in YYYY-MM-DD format
      };
      
      // Remove faqs and reviews from the main document since we'll store them in subcollections
      const { faqs, reviews, ...blogData } = blogWithMetadata;
      
      let blogId = newBlog.id;
      
      if (formMode === 'add') {
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'blogs'), blogData);
        blogId = docRef.id;
      } else {
        // Update existing document
        if (blogId) {
          const blogRef = doc(db, 'blogs', blogId);
          await updateDoc(blogRef, blogData);
        }
      }
      
      // Add FAQs to subcollection
      if (blogId && faqs && faqs.length > 0) {
        // First delete existing FAQs if updating
        if (formMode === 'edit') {
          const faqsSnapshot = await getDocs(collection(db, 'blogs', blogId, 'faqs'));
          for (const doc of faqsSnapshot.docs) {
            await deleteDoc(doc.ref);
          }
        }
        
        // Add all FAQs to subcollection
        for (const faq of faqs) {
          await addDoc(collection(db, 'blogs', blogId, 'faqs'), {
            question: faq.question,
            answer: faq.answer
          });
        }
      }

      // Add Reviews to subcollection
      if (blogId && reviews && reviews.length > 0) {
        // First delete existing Reviews if updating
        if (formMode === 'edit') {
          const reviewsSnapshot = await getDocs(collection(db, 'blogs', blogId, 'reviews'));
          for (const doc of reviewsSnapshot.docs) {
            await deleteDoc(doc.ref);
          }
        }
        
        // Add all Reviews to subcollection
        for (const review of reviews) {
          await addDoc(collection(db, 'blogs', blogId, 'reviews'), {
            name: review.name,
            rating: Number(review.rating),
            review: review.review,
            date: review.date || new Date().toISOString().split('T')[0]
          });
        }
      }
      
      // Reset form and show table
      resetForm();
      
      // Fetch the updated blogs
      const querySnapshot = await getDocs(collection(db, 'blogs'));
      const updatedBlogs = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          title: docData.title || '',
          subtitle: docData.subtitle || '',
          description: docData.description || '',
          date: docData.date || '',
          image: docData.image || '',
          created: docData.created || Date.now(),
          metaTitle: docData.metaTitle || '',
          metaDescription: docData.metaDescription || '',
          slug: docData.slug || '', // Get the slug from database
          faqs: [], // Initialize empty faqs array
          reviews: [], // Initialize empty reviews array
          author: docData.author || 'Anuj Anand Malik' // Default author changed from 'Team AMA'
        };
      });
      setBlogs(updatedBlogs);
      
      // Clear draft on success
      if (formMode === 'add') {
        clearDraft();
      }
      
    } catch (error) {
      console.error("Error processing blog:", error);
    }
  };

  // Handle blog edit - needs to also fetch FAQs and Reviews from subcollections
  const handleEdit = async (blog: Blog) => {
    try {
      // Fetch FAQs for this blog
      const faqsSnapshot = await getDocs(collection(db, 'blogs', blog.id!, 'faqs'));
      const faqs = faqsSnapshot.docs.map(doc => ({
        id: doc.id,
        question: doc.data().question || '',
        answer: doc.data().answer || ''
      }));

      // Fetch Reviews for this blog
      const reviewsSnapshot = await getDocs(collection(db, 'blogs', blog.id!, 'reviews'));
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        rating: doc.data().rating || 5,
        review: doc.data().review || '',
        date: doc.data().date || ''
      }));
      
      setNewBlog({...blog, faqs, reviews});
      setFormMode('edit');
      setShowBlogForm(true);
    } catch (error) {
      console.error("Error fetching subcollections:", error);
      setNewBlog(blog);
      setFormMode('edit');
      setShowBlogForm(true); 
    }
  };
 
  // Handle blog delete
  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        // Get the blog content first to extract image URLs
        const blogDoc = await getDoc(doc(db, 'blogs', id));
        const blogData = blogDoc.data();
        
        if (blogData) {
          // Extract all image URLs from the blog content
          const content = blogData.description || '';
          const imgRegex = /<img[^>]+src="([^">]+)"/g;
          const imageUrls = new Set();
          let match;
          
          while ((match = imgRegex.exec(content)) !== null) {
            imageUrls.add(match[1]);
          }
          
          // Get all blog_images documents
          const imagesSnapshot = await getDocs(collection(db, 'blog_images'));
          const unusedImages = imagesSnapshot.docs.filter(doc => {
            const imageData = doc.data();
            return imageUrls.has(imageData.url);
          });
          
          // Delete unused images from Storage and Firestore
          for (const imageDoc of unusedImages) {
            const imageData = imageDoc.data();
            try {
              // Delete from Storage
              const imageRef = ref(storage, imageData.path);
              await deleteObject(imageRef);
              
              // Delete from Firestore
              await deleteDoc(imageDoc.ref);
            } catch (error) {
              console.error(`Error deleting image ${imageData.filename}:`, error);
            }
          }
        }
        
        // Delete document from Firestore
        await deleteDoc(doc(db, 'blogs', id));
        
        // Update local state
        setBlogs(prevBlogs => prevBlogs.filter(blog => blog.id !== id));
      } catch (error) {
        console.error("Error deleting blog:", error);
      }
    }
  };

  // Reset form state
  const resetForm = () => {
    setNewBlog({
      title: '',
      subtitle: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      image: '',
      created: Date.now(),
      metaTitle: '',
      metaDescription: '',
      slug: '', // Reset slug field
      faqs: [], // Reset FAQs array
      reviews: [], // Reset Reviews array
      author: 'Anuj Anand Malik' // Default author changed from 'Team AMA'
    });
    setPrimaryKeyword('');
    setSecondaryKeyword('');
    setImagePrompt('');
    setExpansionSubtopics('');
    setFormMode('add');
    setShowBlogForm(false);
    clearDraft();
  };

  // Cancel form handler
  const handleCancelForm = () => {
    resetForm();
    clearDraft();
  };

  // Handle pagination
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };

  // Add a function to test the RSS feed
  const testRssFeed = async () => {
    try {
      setIsLoadingRss(true);
      console.log('Testing RSS feed...');
      
      // Fetch the RSS feed
      const response = await fetch('/api/rss');
      console.log('RSS feed response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`RSS feed returned status: ${response.status}`);
      }
      
      // Get the XML content
      const xml = await response.text();
      console.log('RSS feed XML length:', xml.length);
      
      // Basic validation checks
      const isValidXml = xml.includes('<?xml version="1.0"') && 
                        xml.includes('<rss version="2.0"') &&
                        xml.includes('</rss>');
      
      console.log('Is valid XML structure:', isValidXml);
      
      // Count items in feed
      const itemCount = (xml.match(/<item>/g) || []).length;
      console.log('Number of items in feed:', itemCount);
      
      // Check for common issues
      const hasEmptyTitles = xml.includes('<title></title>');
      const hasEmptyLinks = xml.includes('<link></link>');
      const hasMalformedDates = xml.includes('<pubDate>Invalid Date</pubDate>');
      
      console.log('Feed has empty titles:', hasEmptyTitles);
      console.log('Feed has empty links:', hasEmptyLinks);
      console.log('Feed has malformed dates:', hasMalformedDates);
      
      // Set debug info
      setRssDebugInfo(
        `RSS Feed Status: ${response.status === 200 ? '✅ OK' : '❌ Error'}\n` +
        `Valid XML Structure: ${isValidXml ? '✅ Yes' : '❌ No'}\n` +
        `Items in Feed: ${itemCount}\n` +
        `Empty Titles: ${hasEmptyTitles ? '❌ Yes' : '✅ No'}\n` +
        `Empty Links: ${hasEmptyLinks ? '❌ Yes' : '✅ No'}\n` +
        `Malformed Dates: ${hasMalformedDates ? '❌ Yes' : '✅ No'}\n\n` +
        `Sample XML (first 500 chars):\n${xml.substring(0, 500)}...`
      );
    } catch (error) {
      console.error('Error testing RSS feed:', error);
      setRssDebugInfo(`Error testing RSS feed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingRss(false);
    }
  };

  return (
    <div className="p-6">
      {/* Main Dashboard */}
      <motion.div 
        className="flex flex-col pb-12"
        initial={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Dashboard Content */}
        <div className="flex-1 max-w-7xl mx-auto w-full relative z-10">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">IPRKaro Blogs</h2>
              <div className="w-16 h-1 bg-gray-900 rounded-full"></div>
            </div>
          </div>

          {/* Content Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200"
          >
            {/* Header with Add Blog Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {showBlogForm ? (formMode === 'add' ? 'Create New Blog' : 'Edit Blog') : 'Blog Management'}
              </h2>
              <motion.button
                onClick={() => {
                  if (showBlogForm) {
                    resetForm();
                  } else {
                    setFormMode('add');
                    const draftLoaded = loadDraft();
                    setShowBlogForm(true);
                    if (draftLoaded) {
                      alert('Restored draft from previous session.');
                    }
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold shadow-md transition-all"
              >
                <FontAwesomeIcon icon={showBlogForm ? faChartLine : faPlus} className="mr-2" />
                {showBlogForm ? 'View Blogs' : 'Add Blog'}
              </motion.button>
            </div>

            {/* Conditional Rendering: Show either Data Table or Blog Form */}
            {showBlogForm ? (
              // Blog Creation/Edit Form with Updated Fields and Tiptap Editor
              <AnimatePresence mode="wait">
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmitBlog}
                  className="space-y-6"
                >
                  {/* AI Generator Section */}
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8">
                    <h3 className="text-indigo-900 font-bold mb-4 flex items-center text-lg">
                      <FontAwesomeIcon icon={faMagic} className="mr-3 text-indigo-600" />
                      AI Magic Generator
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-semibold text-indigo-900 mb-2">Primary Keyword (Must be specific)</label>
                          <input
                            type="text"
                            value={primaryKeyword}
                            onChange={(e) => setPrimaryKeyword(e.target.value)}
                            placeholder="e.g., 'Trademark Registration in India'"
                            className="w-full px-4 py-3 bg-white border border-indigo-200 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            disabled={isGenerating}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-indigo-900 mb-2">Secondary Keyword (Optional)</label>
                          <input
                            type="text"
                            value={secondaryKeyword}
                            onChange={(e) => setSecondaryKeyword(e.target.value)}
                            placeholder="e.g., 'step by step guide'"
                            className="w-full px-4 py-3 bg-white border border-indigo-200 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            disabled={isGenerating}
                          />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                          Generating Your Masterpiece...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faMagic} className="mr-3" />
                          Generate SEO-Optimized Blog
                        </>
                      )}
                    </button>
                    <p className="text-xs text-indigo-600 mt-4 font-medium italic">
                      ✨ This will automatically craft a high-converting title, content, meta tags, FAQs, and realistic reviews.
                    </p>
                  </div>

                  {/* AI Image Generator Section */}
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8">
                    <h3 className="text-emerald-900 font-bold mb-4 flex items-center text-lg">
                      <FontAwesomeIcon icon={faImage} className="mr-3 text-emerald-600" />
                      AI Image Generator
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div>
                          <label className="block text-sm font-semibold text-emerald-900 mb-2">Image Style/Description</label>
                          <textarea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            placeholder="Describe the image you want (e.g., 'A modern professional law office with a blue and gold theme, high quality cinematic lighting')"
                            rows={2}
                            className="w-full px-4 py-3 bg-white border border-emerald-200 text-emerald-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            disabled={isGeneratingImage}
                          />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {isGeneratingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                          Visualizing Your Ideas...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faImage} className="mr-3" />
                          Generate Custom AI Header Image
                        </>
                      )}
                    </button>
                    <p className="text-xs text-emerald-600 mt-4 font-medium italic">
                      📸 Powered by DALL-E 3. Describe exactly what you want to see!
                    </p>
                  </div>

                  {/* AI Description Expander Section */}
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 mb-8">
                    <h3 className="text-amber-900 font-bold mb-4 flex items-center text-lg">
                      <FontAwesomeIcon icon={faMagic} className="mr-3 text-amber-600" />
                      AI Description Expander
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div>
                          <label className="block text-sm font-semibold text-amber-900 mb-2">Topics/Sections to Add or Expand</label>
                          <textarea
                            value={expansionSubtopics}
                            onChange={(e) => setExpansionSubtopics(e.target.value)}
                            placeholder="e.g., 'Add a detailed table on copyright fees' or 'Expand on the difference between music recording and lyrical copyright'"
                            rows={3}
                            className="w-full px-4 py-3 bg-white border border-amber-200 text-amber-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                            disabled={isExpanding}
                          />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExpandDescription}
                      disabled={isExpanding || !newBlog.description}
                      className="mt-6 w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-amber-200 transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {isExpanding ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                          Expanding Content Knowledge...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faMagic} className="mr-3" />
                          Expand Blog Description
                        </>
                      )}
                    </button>
                    <p className="text-xs text-amber-600 mt-4 font-medium italic">
                      🚀 Use this to add more depth, tables, and specific sections to your blog!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Blog Title</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={newBlog.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="Enter blog title"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">URL Slug</label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        value={newBlog.slug}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="url-friendly-blog-name"
                      />
                      <p className="mt-2 text-xs text-gray-500">Will be used in the URL: /resources/{newBlog.slug}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-2">Subtitle/SEO Keywords</label>
                      <input
                        type="text"
                        id="subtitle"
                        name="subtitle"
                        value={newBlog.subtitle}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="Enter subtitle or SEO keywords"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                      <input
                        type="text"
                        id="metaTitle"
                        name="metaTitle"
                        value={newBlog.metaTitle || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="Enter meta title for SEO"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">Publication Date</label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={newBlog.date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">Blog Image</label>
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            id="image-upload"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <motion.button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 rounded-lg text-sm font-medium flex items-center transition-all"
                          >
                            <FontAwesomeIcon icon={faUpload} className="mr-2" />
                            {uploading ? 'Uploading...' : 'Choose Image'}
                          </motion.button>
                          {newBlog.image && (
                            <span className="text-xs text-green-600">✓ Image uploaded successfully</span>
                          )}
                        </div>
                        
                        {uploading && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-gray-900 h-2.5 rounded-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Image preview */}
                        {(imagePreview || newBlog.image) && (
                          <div className="mt-2">
                            <img 
                              src={imagePreview || newBlog.image} 
                              alt="Blog image preview" 
                              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-md"
                            />
                          </div>
                        )}
                        
                        <input
                          type="hidden"
                          id="image"
                          name="image"
                          value={newBlog.image}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                      <input
                        type="text"
                        id="metaDescription"
                        name="metaDescription"
                        value={newBlog.metaDescription || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                        placeholder="Enter meta description for SEO"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                      <select
                        id="author"
                        name="author"
                        value={newBlog.author}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all"
                      >
                        <option value="Anuj Anand Malik">Anuj Anand Malik</option>
                        <option value="Shrey Arora">Shrey Arora</option>
                      </select>
                    </div>
                  </div>
                  {/* FAQs Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h3>
                      <motion.button
                        type="button"
                        onClick={addFaq}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Add FAQ
                      </motion.button>
                    </div>
                    
                    {newBlog.faqs && newBlog.faqs.length > 0 ? (
                      <div className="space-y-4">
                        {newBlog.faqs.map((faq, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                            <button
                              type="button"
                              onClick={() => removeFaq(index)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                              title="Remove FAQ"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                                placeholder="Enter question"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Answer</label>
                              <textarea
                                value={faq.answer}
                                onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                                placeholder="Enter answer"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No FAQs added yet.</p>
                    )}
                  </div>

                  {/* Reviews Section */}
                  <div className="border-t pt-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Review Snippets</h3>
                      <motion.button
                        type="button"
                        onClick={addReview}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Add Review
                      </motion.button>
                    </div>
                    
                    {newBlog.reviews && newBlog.reviews.length > 0 ? (
                      <div className="space-y-4">
                        {newBlog.reviews.map((review, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                            <button
                              type="button"
                              onClick={() => removeReview(index)}
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                              title="Remove Review"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Reviewer Name</label>
                                <input
                                  type="text"
                                  value={review.name}
                                  onChange={(e) => handleReviewChange(index, 'name', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                                  placeholder="Enter reviewer name"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Rating (1-5)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={review.rating}
                                  onChange={(e) => handleReviewChange(index, 'rating', Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                                />
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Review Date</label>
                              <input
                                type="date"
                                value={review.date || ''}
                                onChange={(e) => handleReviewChange(index, 'date', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Review Text</label>
                              <textarea
                                value={review.review}
                                onChange={(e) => handleReviewChange(index, 'review', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 text-black"
                                placeholder="Enter review text"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No reviews added yet.</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Blog Content</label>
                    {/* Tiptap Editor Integration */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                      {typeof window !== 'undefined' && (
                        <TiptapEditor
                          content={newBlog.description}
                          onChange={handleEditorChange}
                          className="bg-white text-black h-[500px]"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Use the toolbar above to format your content.</p>
                  </div>
                  
                  <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">RSS Feed Information</h3>
                    <p className="text-xs text-blue-700">
                      Your blog will be automatically added to the RSS feed at <strong className="text-blue-900">{process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://www.amalegalsolutions.com'}/api/rss</strong> 
                      which syncs with LinkedIn's RSS automation feature.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <motion.button
                      type="button"
                      onClick={handleCancelForm}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium border border-gray-300 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold shadow-md transition-all"
                    >
                      {formMode === 'add' ? 'Publish Blog' : 'Update Blog'}
                    </motion.button>
                  </div>
                </motion.form>
              </AnimatePresence>
            ) : (
              // Blogs Table
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-x-auto rounded-lg"
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subtitle</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Image</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentBlogs.length > 0 ? (
                        currentBlogs.map((blog) => (
                          <tr key={blog.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(blog.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">{blog.title}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{blog.subtitle}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <img src={blog.image} alt="" className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200 shadow-sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <motion.button
                                  onClick={() => handleEdit(blog)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center shadow-sm transition-all"
                                >
                                  <FontAwesomeIcon icon={faEdit} className="mr-1" />
                                  Edit
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDelete(blog.id)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs flex items-center shadow-sm transition-all"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                  Delete
                                </motion.button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                            No blogs found. Click Add Blog to create a new blog.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, blogs.length)}</span> of <span className="font-semibold text-gray-900">{blogs.length}</span> results
                    </div>
                    <div className="flex space-x-3">
                      <motion.button
                        onClick={handlePreviousPage}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-sm font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        disabled={currentPage === 1}
                      >
                        Previous
                      </motion.button>
                      <motion.button
                        onClick={handleNextPage}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-sm font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* RSS Feed Debug Panel - Add this at the end of the content section */}
            {!showBlogForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 p-6 border border-blue-200 rounded-lg bg-blue-50"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <h3 className="text-lg font-bold text-blue-900">RSS Feed Diagnostics</h3>
                  <motion.button
                    onClick={testRssFeed}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoadingRss}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center font-medium shadow-sm transition-all disabled:opacity-50"
                  >
                    {isLoadingRss ? 'Testing...' : 'Test RSS Feed'}
                  </motion.button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <a 
                    href="/api/rss" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                  >
                    View RSS Feed →
                  </a>
                  <a 
                    href="https://validator.w3.org/feed/check.cgi?url=https://www.amalegalsolutions.com/api/rss" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                  >
                    Validate with W3C Feed Validator →
                  </a>
                </div>
                
                {rssDebugInfo && (
                  <div className="mt-4">
                    <pre className="bg-white p-4 rounded-lg text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap border border-gray-200 shadow-sm">
                      {rssDebugInfo}
                    </pre>
                  </div>
                )}
                
                <p className="mt-4 text-xs text-blue-700 bg-blue-100 p-3 rounded-md border border-blue-200">
                  <strong className="text-blue-900">Tip:</strong> RSS feeds should be valid XML with proper entity escaping for special characters. 
                  Make sure all required fields (title, link, description, pubDate) are present for each item.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default BlogsDashboard;
