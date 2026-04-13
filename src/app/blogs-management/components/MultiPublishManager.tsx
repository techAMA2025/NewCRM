'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagic, 
  faRocket, 
  faShieldAlt,
  faBalanceScale,
  faGlobe,
  faCheckCircle,
  faSpinner,
  faArrowRight,
  faEdit,
  faExpandAlt,
  faPlus,
  faTrash,
  faUpload,
  faCalendarAlt,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { collection, addDoc } from 'firebase/firestore';
import dynamic from 'next/dynamic';

// Import project-specific firebase configs
import { db as amaDb, storage as amaStorage } from '@/firebase/ama';
import { db as csDb, storage as csStorage } from '@/firebase/credsettle';
import { db as iprDb, storage as iprStorage } from '@/firebase/iprkaro';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Dynamically import Tiptap editors
const TiptapEditorAma = dynamic(() => import('./TiptapEditorama'), { ssr: false });
const TiptapEditorCs = dynamic(() => import('./TiptapEditorcs'), { ssr: false });
const TiptapEditorIpr = dynamic(() => import('./TiptapEditoripr'), { ssr: false });

interface FAQ {
  question: string;
  answer: string;
}

interface Review {
  name: string;
  rating: number;
  review: string;
}

interface BlogState {
  title: string;
  subtitle: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  faqs: FAQ[];
  reviews: Review[];
  image: string;
  imagePrompt: string;
  author: string;
  date: string;
}

const emptyBlog: BlogState = {
  title: '',
  subtitle: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  slug: '',
  faqs: [],
  reviews: [],
  image: '',
  imagePrompt: '',
  author: 'Anuj Anand Malik',
  date: new Date().toISOString().split('T')[0]
};

const MultiPublishManager = () => {
  const [primaryKeywords, setPrimaryKeywords] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [activePlatform, setActivePlatform] = useState<'ama' | 'credsettle' | 'iprkaro'>('ama');
  
  // Independent States for each platform
  const [amaData, setAmaData] = useState<BlogState>(emptyBlog);
  const [csData, setCsData] = useState<BlogState>(emptyBlog);
  const [iprData, setIprData] = useState<BlogState>(emptyBlog);

  // Status states
  const [genStatus, setGenStatus] = useState({ ama: false, credsettle: false, iprkaro: false });
  const [pubStatus, setPubStatus] = useState<{
    ama: 'idle' | 'loading' | 'success' | 'error';
    credsettle: 'idle' | 'loading' | 'success' | 'error';
    iprkaro: 'idle' | 'loading' | 'success' | 'error';
  }>({
    ama: 'idle',
    credsettle: 'idle',
    iprkaro: 'idle'
  });

  // Expansion States
  const [expansionPrompts, setExpansionPrompts] = useState({
    ama: '',
    credsettle: '',
    iprkaro: ''
  });
  const [expandingPlatform, setExpandingPlatform] = useState<'ama' | 'credsettle' | 'iprkaro' | null>(null);
  const [generatingImagePlatform, setGeneratingImagePlatform] = useState<'ama' | 'credsettle' | 'iprkaro' | null>(null);

  const handleGenerate = async (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    if (!primaryKeywords.trim()) {
      alert('Please enter primary keywords first');
      return;
    }

    const apiMap = {
      ama: '/api/ama-blog/generate-article',
      credsettle: '/api/credsettle-blog/generate-blog',
      iprkaro: '/api/ipr-karo-blog/generate-article'
    };

    try {
      setGenStatus(prev => ({ ...prev, [platform]: true }));
      const response = await fetch(apiMap[platform], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryKeyword: primaryKeywords, secondaryKeyword: secondaryKeywords }),
      });

      if (!response.ok) throw new Error(`${platform} generation failed`);

      const text = await response.text();
      const data = JSON.parse(text);

      const newState: BlogState = {
        ...getActiveData(),
        title: data.title || '',
        subtitle: data.subtitle || '',
        description: data.description || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        slug: data.slug || '',
        faqs: data.faqs || [],
        reviews: data.reviews || [],
        image: '',
        imagePrompt: data.suggestedImagePrompt || ''
      };

      if (platform === 'ama') setAmaData(newState);
      else if (platform === 'credsettle') setCsData(newState);
      else setIprData(newState);

    } catch (error) {
      console.error(`${platform} generation error:`, error);
      alert(`${platform} generation failed. Please try again.`);
    } finally {
      setGenStatus(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleExpandContent = async (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const currentData = platform === 'ama' ? amaData : platform === 'credsettle' ? csData : iprData;
    const prompt = expansionPrompts[platform];

    if (!currentData.description) {
      alert('No content to expand. Please generate content first.');
      return;
    }

    setExpandingPlatform(platform);

    try {
      if (platform === 'ama') {
        const response = await fetch('/api/ama-blog/expand-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: currentData.description, prompt }),
        });

        if (!response.ok) throw new Error('AMA expansion failed');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = currentData.description;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setAmaData(prev => ({ ...prev, description: fullContent }));
        }
      } 
      else if (platform === 'credsettle') {
        const response = await fetch('/api/credsettle-blog/expand-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentContent: currentData.description, expansionPrompt: prompt }),
        });

        if (!response.ok) throw new Error('CredSettle expansion failed');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = currentData.description;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setCsData(prev => ({ ...prev, description: fullContent }));
        }
      }
      else if (platform === 'iprkaro') {
        const response = await fetch('/api/ipr-karo-blog/expand-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentDescription: currentData.description, 
            expansionSubtopics: prompt || 'Expand the content with more legal details and procedures.',
            primaryKeyword: primaryKeywords 
          }),
        });

        if (!response.ok) throw new Error('IPR Karo expansion failed');
        const data = await response.json();
        setIprData(prev => ({ ...prev, description: data.expandedDescription }));
      }
    } catch (error) {
      console.error('Expansion error:', error);
      alert('Failed to expand content. Please try again.');
    } finally {
      setExpandingPlatform(null);
    }
  };

  const handlePublish = async (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const data = platform === 'ama' ? amaData : platform === 'credsettle' ? csData : iprData;
    
    if (!data.title) {
        alert('Please generate content first');
        return;
    }

    if (!window.confirm(`Publish to ${platform.toUpperCase()} now?`)) return;

    setPubStatus(prev => ({ ...prev, [platform]: 'loading' }));

    try {
      if (platform === 'ama') {
        const { faqs, reviews, ...coreData } = data;
        const docRef = await addDoc(collection(amaDb, 'blogs'), {
          ...coreData,
          created: Date.now()
        });
        for (const faq of faqs) await addDoc(collection(amaDb, 'blogs', docRef.id, 'faqs'), faq);
        for (const review of reviews) await addDoc(collection(amaDb, 'blogs', docRef.id, 'reviews'), review);
      } 
      else if (platform === 'credsettle') {
        const { faqs, reviews, ...coreData } = data;
        const docRef = await addDoc(collection(csDb, 'blogs'), {
          ...coreData,
          created: Date.now()
        });
        for (const faq of faqs) await addDoc(collection(csDb, 'blogs', docRef.id, 'faqs'), faq);
        for (const review of reviews) {
          await addDoc(collection(csDb, 'blogs', docRef.id, 'reviews'), {
            author: review.name,
            rating: review.rating,
            comment: review.review,
            date: new Date().toISOString()
          });
        }
      }
      else {
        const { faqs, reviews, ...coreData } = data;
        const docRef = await addDoc(collection(iprDb, 'blogs'), {
          ...coreData,
          created: Date.now()
        });
        for (const faq of faqs) await addDoc(collection(iprDb, 'blogs', docRef.id, 'faqs'), faq);
        for (const review of reviews) {
          await addDoc(collection(iprDb, 'blogs', docRef.id, 'reviews'), {
            ...review,
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
      setPubStatus(prev => ({ ...prev, [platform]: 'success' }));
      alert(`${platform.toUpperCase()} Blog published successfully!`);
    } catch (e) {
      console.error(e);
      setPubStatus(prev => ({ ...prev, [platform]: 'error' }));
      alert(`Publication to ${platform} failed.`);
    }
  };

  const getActiveData = () => {
    if (activePlatform === 'ama') return amaData;
    if (activePlatform === 'credsettle') return csData;
    return iprData;
  };

  const setActiveData = (data: BlogState) => {
    if (activePlatform === 'ama') setAmaData(data);
    else if (activePlatform === 'credsettle') setCsData(data);
    else setIprData(data);
  };

  const handleGenerateImage = async (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const data = platform === 'ama' ? amaData : platform === 'credsettle' ? csData : iprData;
    if (!data.imagePrompt) {
      alert('Please provide an image prompt');
      return;
    }

    setGeneratingImagePlatform(platform);

    try {
      const apiMap = {
        ama: '/api/ama-blog/generate-image',
        credsettle: '/api/credsettle-blog/generate-image',
        iprkaro: '/api/ipr-karo-blog/generate-image'
      };

      const response = await fetch(apiMap[platform], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: data.imagePrompt }),
      });

      if (!response.ok) throw new Error(`${platform} image generation failed`);

      const result = await response.json();
      const imageUrl = platform === 'credsettle' ? result.url : result.imageUrl;

      if (platform === 'ama') setAmaData(prev => ({ ...prev, image: imageUrl }));
      else if (platform === 'credsettle') setCsData(prev => ({ ...prev, image: imageUrl }));
      else setIprData(prev => ({ ...prev, image: imageUrl }));

      alert(`${platform.toUpperCase()} image generated successfully!`);
    } catch (error) {
      console.error(`${platform} image generation error:`, error);
      alert('Failed to generate image');
    } finally {
      setGeneratingImagePlatform(null);
    }
  };

  // Image Upload Logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storage = platform === 'ama' ? amaStorage : platform === 'credsettle' ? csStorage : iprStorage;
    const storageRef = ref(storage, `blog-images/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
      updateFn(prev => ({ ...prev, image: url }));
      alert(`${platform.toUpperCase()} image uploaded!`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image');
    }
  };

  // FAQ Handlers
  const addFaq = (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }]
    }));
  };

  const removeFaq = (platform: 'ama' | 'credsettle' | 'iprkaro', index: number) => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const handleFaqChange = (platform: 'ama' | 'credsettle' | 'iprkaro', index: number, field: 'question' | 'answer', value: string) => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => {
      const newFaqs = [...prev.faqs];
      newFaqs[index] = { ...newFaqs[index], [field]: value };
      return { ...prev, faqs: newFaqs };
    });
  };

  // Review Handlers
  const addReview = (platform: 'ama' | 'credsettle' | 'iprkaro') => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => ({
      ...prev,
      reviews: [...(prev.reviews || []), { name: '', rating: 5, review: '' }]
    }));
  };

  const removeReview = (platform: 'ama' | 'credsettle' | 'iprkaro', index: number) => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => ({
      ...prev,
      reviews: prev.reviews.filter((_, i) => i !== index)
    }));
  };

  const handleReviewChange = (platform: 'ama' | 'credsettle' | 'iprkaro', index: number, field: keyof Review, value: any) => {
    const updateFn = platform === 'ama' ? setAmaData : platform === 'credsettle' ? setCsData : setIprData;
    updateFn(prev => {
      const newReviews = [...prev.reviews];
      newReviews[index] = { ...newReviews[index], [field]: value };
      return { ...prev, reviews: newReviews };
    });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Horizontal Top Bar - Step 1 */}
      <div className="bg-white border-b border-indigo-100 p-4 shadow-sm flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-3 pr-6 border-r border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <FontAwesomeIcon icon={faRocket} className="text-sm" />
          </div>
          <h1 className="text-sm font-black text-black uppercase tracking-widest whitespace-nowrap">Blog Hub</h1>
        </div>

        <div className="flex-1 flex gap-4">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Primary Strategy..."
              className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 transition-all outline-none bg-white text-black text-xs font-bold"
              value={primaryKeywords}
              onChange={(e) => setPrimaryKeywords(e.target.value)}
            />
          </div>
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Supporting Nuances..."
              className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 transition-all outline-none bg-white text-black text-xs"
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pl-6 border-l border-gray-100">
          {['ama', 'credsettle', 'iprkaro'].map(p => (
            <div key={p} className="flex items-center gap-2 group cursor-help">
              <div className={`w-2 h-2 rounded-full shadow-sm transition-all ${pubStatus[p as keyof typeof pubStatus] === 'success' ? 'bg-emerald-500 scale-125' : 'bg-gray-200'}`} />
              <span className={`text-[10px] font-bold uppercase transition-colors ${pubStatus[p as keyof typeof pubStatus] === 'success' ? 'text-emerald-600' : 'text-gray-400'}`}>
                {p}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-12 p-4 gap-4">
        {/* Left Sidebar - Navigation & Actions (Col 2) */}
        <div className="col-span-2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
            <h3 className="text-[9px] font-black text-black uppercase tracking-widest px-1 mb-1">Sequence</h3>
            
            {[
              { id: 'ama', name: 'AMA Legal', icon: faShieldAlt, color: 'indigo' },
              { id: 'credsettle', name: 'CredSettle', icon: faBalanceScale, color: 'emerald' },
              { id: 'iprkaro', name: 'IPRKaro', icon: faGlobe, color: 'amber' }
            ].map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id as any)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  activePlatform === p.id 
                    ? `bg-${p.color}-50 text-${p.color}-700 border-${p.color}-200 shadow-sm` 
                    : 'hover:bg-gray-50 border-transparent text-black opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-black">
                  <span className="opacity-30">0{idx + 1}</span>
                  <FontAwesomeIcon icon={p.icon} className={activePlatform === p.id ? `text-${p.color}-500` : ''} />
                  {p.name}
                </div>
                {pubStatus[p.id as keyof typeof pubStatus] === 'success' && (
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 ml-auto" />
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
             <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-b pb-2">Actions</h3>
             
             <button
               onClick={() => handleGenerate(activePlatform)}
               disabled={genStatus[activePlatform]}
               className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                 genStatus[activePlatform] 
                   ? 'bg-gray-100 text-gray-400' 
                   : 'bg-black text-white hover:bg-gray-800 shadow-md'
               }`}
             >
               <FontAwesomeIcon icon={genStatus[activePlatform] ? faSpinner : faMagic} spin={genStatus[activePlatform]} />
               {genStatus[activePlatform] ? 'Generating...' : `Gen ${activePlatform.toUpperCase()}`}
             </button>

             <button
               onClick={() => handlePublish(activePlatform)}
               disabled={pubStatus[activePlatform] === 'loading' || !getActiveData().title}
               className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                 pubStatus[activePlatform] === 'loading' || !getActiveData().title
                   ? 'bg-gray-50 text-gray-300' 
                   : 'bg-emerald-600 text-white hover:bg-emerald-700'
               }`}
             >
               <FontAwesomeIcon icon={pubStatus[activePlatform] === 'loading' ? faSpinner : faRocket} spin={pubStatus[activePlatform] === 'loading'} />
               {pubStatus[activePlatform] === 'loading' ? 'Publishing...' : `Publish ${activePlatform.toUpperCase()}`}
             </button>
          </div>
        </div>

        {/* Center Workspace - Editor (Col 7) */}
        <div className="col-span-7 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-${activePlatform === 'ama' ? 'indigo' : activePlatform === 'credsettle' ? 'emerald' : 'amber'}-600`}>
                  <FontAwesomeIcon icon={activePlatform === 'ama' ? faShieldAlt : activePlatform === 'credsettle' ? faBalanceScale : faGlobe} className="text-xs" />
                </div>
                <h2 className="font-black text-sm text-black tracking-tight">{activePlatform.toUpperCase()} Editor</h2>
              </div>
              {pubStatus[activePlatform] === 'success' && (
                <span className="text-emerald-600 text-[10px] font-black tracking-widest flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} /> LIVE
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Image & Header Compact Area */}
              <div className="flex gap-6">
                <div className="w-40 h-28 shrink-0 relative group rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                  {getActiveData().image ? (
                    <>
                      <img src={getActiveData().image} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setActiveData({ ...getActiveData(), image: '' })}
                        className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                      </button>
                    </>
                  ) : (
                    <div className="text-[9px] font-black text-gray-300 uppercase">Featured Visual</div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <input
                    type="text"
                    className="w-full text-2xl font-black text-black border-b border-gray-100 focus:border-indigo-500 transition-all outline-none pb-2 bg-white"
                    placeholder="Article Content Strategy Title..."
                    value={getActiveData().title}
                    onChange={(e) => setActiveData({ ...getActiveData(), title: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-full text-sm font-medium text-black opacity-60 border-b border-transparent focus:border-indigo-300 transition-all outline-none pb-1 bg-white"
                    placeholder="Hook or descriptive subtitle..."
                    value={getActiveData().subtitle}
                    onChange={(e) => setActiveData({ ...getActiveData(), subtitle: e.target.value })}
                  />
                </div>
              </div>

              {/* Tiptap Integration */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden min-h-[600px] flex flex-col bg-white shadow-sm ring-1 ring-black/5">
                {activePlatform === 'ama' && <TiptapEditorAma className="h-full" content={amaData.description} onChange={(html) => setAmaData(prev => ({ ...prev, description: html }))} />}
                {activePlatform === 'credsettle' && <TiptapEditorCs className="h-full" content={csData.description} onChange={(html) => setCsData(prev => ({ ...prev, description: html }))} />}
                {activePlatform === 'iprkaro' && <TiptapEditorIpr className="h-full" content={iprData.description} onChange={(html) => setIprData(prev => ({ ...prev, description: html }))} />}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Utils & SEO (Col 3) */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {/* Metadata Section */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-b pb-2">Platform Context</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase">Author</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-100 text-[10px] bg-white text-black font-bold"
                  value={getActiveData().author}
                  onChange={(e) => setActiveData({ ...getActiveData(), author: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase">Publish Date</label>
                <input
                  type="date"
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-100 text-[10px] bg-white text-black"
                  value={getActiveData().date}
                  onChange={(e) => setActiveData({ ...getActiveData(), date: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase">Slug Structure</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-100 text-[10px] bg-white text-black font-mono"
                  value={getActiveData().slug}
                  onChange={(e) => setActiveData({ ...getActiveData(), slug: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* AI Command Center - Unified Instructions */}
          <div className="bg-indigo-900 rounded-2xl p-4 shadow-lg text-white space-y-5">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-200 border-b border-indigo-800 pb-2">AI Command Center</h3>
            
            {/* Visual AI Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[8px] font-bold uppercase tracking-widest text-indigo-300">Visual Generator</label>
                <button
                  onClick={() => handleGenerateImage(activePlatform)}
                  disabled={generatingImagePlatform !== null || !getActiveData().imagePrompt}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-2 transition-all ${
                    generatingImagePlatform !== null
                      ? 'bg-indigo-800 text-indigo-400'
                      : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-sm'
                  }`}
                >
                  <FontAwesomeIcon icon={generatingImagePlatform === activePlatform ? faSpinner : faMagic} spin={generatingImagePlatform === activePlatform} />
                  Run Visual AI
                </button>
              </div>
              <textarea
                placeholder="DALL-E prompts here..."
                className="w-full px-3 py-2 rounded-xl border border-indigo-700 text-[10px] focus:ring-1 focus:ring-white transition-all outline-none bg-indigo-950/50 text-indigo-100 min-h-[50px] resize-none"
                value={getActiveData().imagePrompt}
                onChange={(e) => setActiveData({ ...getActiveData(), imagePrompt: e.target.value })}
              />
            </div>

            {/* Content AI Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[8px] font-bold uppercase tracking-widest text-indigo-300">Content Expansion</label>
                <button
                  onClick={() => handleExpandContent(activePlatform)}
                  disabled={expandingPlatform !== null || !getActiveData().description}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-2 transition-all ${
                    expandingPlatform !== null 
                      ? 'bg-indigo-800 text-indigo-400' 
                      : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-sm'
                  }`}
                >
                  <FontAwesomeIcon icon={expandingPlatform === activePlatform ? faSpinner : faExpandAlt} spin={expandingPlatform === activePlatform} />
                  Run Content Expansion
                </button>
              </div>
              <textarea
                placeholder="Specific instructions for expansion..."
                className="w-full px-3 py-2 rounded-xl border border-indigo-700 text-[10px] focus:ring-1 focus:ring-white transition-all outline-none bg-indigo-950/50 text-indigo-100 min-h-[50px] resize-none font-medium"
                value={expansionPrompts[activePlatform]}
                onChange={(e) => setExpansionPrompts(prev => ({ ...prev, [activePlatform]: e.target.value }))}
              />
            </div>
          </div>

          {/* SEO Performance */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-b pb-2">SEO Performance</h3>
            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase">Meta Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-gray-100 text-[10px] bg-white text-black font-bold"
                value={getActiveData().metaTitle}
                onChange={(e) => setActiveData({ ...getActiveData(), metaTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase">Meta Description</label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-gray-100 text-[10px] bg-white text-black min-h-[60px] resize-none"
                value={getActiveData().metaDescription}
                onChange={(e) => setActiveData({ ...getActiveData(), metaDescription: e.target.value })}
              />
            </div>
          </div>

          {/* List Management Collapsibles */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-[9px] font-black text-black uppercase tracking-widest">FAQs</h3>
                <button onClick={() => addFaq(activePlatform)} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">Add</button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 small-scrollbar">
                {getActiveData().faqs.map((faq, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg space-y-1 relative group">
                    <input
                      type="text"
                      placeholder="Q"
                      className="w-full bg-transparent text-[10px] font-black text-black outline-none"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(activePlatform, idx, 'question', e.target.value)}
                    />
                    <textarea
                      placeholder="A"
                      className="w-full bg-transparent text-[9px] text-gray-600 outline-none resize-none"
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(activePlatform, idx, 'answer', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-[9px] font-black text-black uppercase tracking-widest">Reviews</h3>
                <button onClick={() => addReview(activePlatform)} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Add</button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 small-scrollbar">
                {getActiveData().reviews.map((review, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg space-y-1">
                    <div className="flex justify-between">
                      <input
                        type="text"
                        placeholder="Reviewer"
                        className="bg-transparent text-[10px] font-black text-black outline-none flex-1"
                        value={review.name}
                        onChange={(e) => handleReviewChange(activePlatform, idx, 'name', e.target.value)}
                      />
                      <span className="text-[10px]">⭐ {review.rating}</span>
                    </div>
                    <textarea
                      placeholder="Review text..."
                      className="w-full bg-transparent text-[9px] text-gray-600 outline-none resize-none"
                      value={review.review}
                      onChange={(e) => handleReviewChange(activePlatform, idx, 'review', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiPublishManager;
