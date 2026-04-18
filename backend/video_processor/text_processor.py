import re

class TextProcessor:
    def __init__(self):
        # Conversational replacements
        self.formal_to_casual = {
            'presentation': 'talk',
            'demonstrate': 'show',
            'utilize': 'use',
            'implement': 'create',
            'furthermore': 'also',
            'therefore': 'so',
            'however': 'but',
            'nevertheless': 'still',
            'consequently': 'as a result',
        }
        
        # Filler words for natural speech
        self.fillers = ['you know', 'like', 'basically', 'actually']
    
    def add_conversational_style(self, text, slang_level='medium'):
        """Convert formal text to conversational style"""
        if slang_level == 'none':
            return text
        
        # Apply replacements
        for formal, casual in self.formal_to_casual.items():
            pattern = r'\b' + formal + r'\b'
            text = re.sub(pattern, casual, text, flags=re.IGNORECASE)
        
        # Add natural pauses
        text = text.replace('. ', '... ')
        
        # Add occasional filler words if high slang
        if slang_level == 'high':
            sentences_list = text.split('... ')
            result_sentences = []
            for i, sentence in enumerate(sentences_list):
                words = sentence.split()
                if len(words) > 12 and i % 3 == 0:
                    insert_pos = len(words) // 2
                    words.insert(insert_pos, 'you know')
                    result_sentences.append(' '.join(words))
                else:
                    result_sentences.append(sentence)
            text = '... '.join(result_sentences)
        
        return text
    
    def format_for_speech(self, slides_data, slang_level='medium'):
        """Convert slides to speech-ready script"""
        script_parts = []
        
        for i, slide in enumerate(slides_data):
            # Introduction for first slide
            if i == 0:
                intro = f"Hey everyone! Welcome to our presentation. "
                script_parts.append(intro)
            
            # Use speaker notes if available, otherwise use slide content
            content = slide['notes'] if slide['notes'] else slide['content']
            
            # Skip empty slides
            if not content or len(content.strip()) < 10:
                continue
            
            # Add slide transition
            if i > 0:
                transition = f"Moving on to our next point. "
                script_parts.append(transition)
            
            # Process content
            processed = self.add_conversational_style(content, slang_level)
            script_parts.append(processed)
            
            # Add pause between slides
            script_parts.append(" ... ")
        
        # Conclusion
        script_parts.append("And that wraps up our presentation. Thanks for watching!")
        
        full_script = ' '.join(script_parts)
        
        # Clean up multiple spaces and pauses
        full_script = re.sub(r'\s+', ' ', full_script)
        full_script = re.sub(r'\.{3,}', '...', full_script)
        
        return full_script.strip()

    def _clean_for_speech(self, text):
        """Cleans text so text-to-speech doesn't fail on code or weird symbols."""
        if not text: return ""
        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)
        
        # CRITICAL FIX: Add proper gaps and stoppages to headings and bullet points 
        # so they don't continuously overflow into one giant spoken sentence.
        # If a line doesn't end in punctuation, append a pause marker (...)
        text = re.sub(r'(?<![.,?!;:])\s*\n', '... \n', text)
        text = text.replace('\n', ' ')
        
        # Handle common symbols
        text = text.replace('&', ' and ').replace('+', ' plus ').replace('@', ' at ')
        text = text.replace('_', ' ').replace('{', ' ').replace('}', ' ')
        text = text.replace('[', ' ').replace(']', ' ').replace('*', ' ')
        # Remove any weird standalone punctuation. Hyphen MUST be at the end of the regex class.
        text = re.sub(r'[^\w\s.,?!;:\'"-]', ' ', text)
        # Collapse multiple spaces
        return re.sub(r'\s+', ' ', text).strip()

    def generate_summary(self, slides_data):
        """Generates a brief 2-3 sentence summary of the lesson."""
        import os
        import requests
        
        OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        AI_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        # Extract all content
        full_content = " ".join([str(s.get('content', '')) + " " + str(s.get('notes', '')) for s in slides_data])
        if len(full_content) < 50:
            full_content = " ".join([str(s.get('title', '')) for s in slides_data])
            
        prompt = f"""Summarize the following lesson content into exactly 2-3 engaging, professional sentences. 
Do NOT use bullet points. Do NOT use introductory phrases like "This lesson is about". 
Just provide the summary text directly. Ensure it ends with a period.

Content: 
{full_content[:2000]}
"""
        
        try:
            payload = {
                "model": AI_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.5
            }
            response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=60)
            if response.status_code == 200:
                summary = response.json().get('response', '').strip()
                if summary:
                    return summary.strip('"').strip("'")
        except Exception as e:
            print(f"Summary generation failed: {e}")
            
        # Fallback summary
        topics = [s.get('title', '') for s in slides_data if s.get('title')]
        topics_str = ", ".join(topics[:3])
        return f"This comprehensive lesson covers {topics_str if topics_str else 'the uploaded presentation'}. Learn the essential concepts and practical applications through this professional AI-led presentation."

    def format_for_speech_per_slide(self, slides_data, slang_level='medium'):
        """
        Returns a list of narration strings — one per slide.
        Ensures NO word is skipped and NO titles are repeated twice.
        """
        import os
        import requests
        try:
            from groq import Groq
        except ImportError:
            Groq = None
        
        groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        AI_MODEL = os.getenv("OLLAMA_MODEL", "tinyllama")
        
        scripts = []
        total = len(slides_data)
        
        for i, slide in enumerate(slides_data):
            title = slide.get('title', '').strip()
            content = slide.get('notes') or slide.get('content', '')
            content = content.replace('\r', '').strip()
            
            clean_content = self._clean_for_speech(content)
            
            def _normalize(s): return re.sub(r'[^a-zA-Z0-9]', '', s).lower()
            norm_title = _normalize(title)
            if clean_content and norm_title:
                norm_content_start = _normalize(clean_content[:len(title) + 20])
                if norm_title in norm_content_start:
                    clean_content = clean_content.replace(title, '', 1).strip()

            if not clean_content or len(clean_content) < 5:
                clean_content = f"On this slide, we focus on {title}."
            
            is_first_slide = (i == 0)
            is_last_slide = (i == total - 1)
            
            sys_prompt = f"""You are the EDUFACE ELITE NARRATOR. 

### ‼️ CRITICAL RULES for SLIDE {i+1} ‼️
1. **NO INTRODUCTIONS**: { 'You MUST start with "Welcome to this lesson."' if is_first_slide else 'DO NOT say "Welcome", "Hello", or "Hi". Slide 1 is already finished. Start IMMEDIATELY with a transition like "Moving on to..." or "Continuing with..."'}
2. **ZERO SUMMARIZATION**: You are narrating the FULL text. You must not skip a single bullet point or detail.
3. **HIGH REALISM**: You must include realistic facial motion markers (eye blinks, eyebrow movements, slight head tilts) in the FACE tag to guide the animation engine.

### 📜 SLIDE DATA
**TITLE**: {title}
**BODY**:
{clean_content}

### 📤 OUTPUT REQUIREMENTS
- **Start text**: { '"Welcome to this lesson."' if is_first_slide else '"Continuing to our next topic, ' + title + '."' }
- **Body text**: Convert every single point from the BODY section into professional, flowing spoken sentences. DO NOT SHORTEN.
- **Facial Animation**: In the 'FACE' section, specify natural actions: 'eye_blink', 'eyebrow_lift', 'slight_head_tilt', 'natural_smile'.

[SCENE START]
TEXT: "[Insert the FULL script here. Maintain absolute fidelity to the input body.]"
FACE: "eye_blink, natural_smile, slight_head_tilt during transitions, eyebrow_lift on important keywords. Realistic 4k facial expressions."
TIMING: - duration: [1s per 10 characters]
"""
            
            failsafe_opening = "Welcome to this lesson. " if is_first_slide else "Now let's continue. "
            failsafe_text = f"{failsafe_opening}{title}... {clean_content}."
            if is_last_slide:
                failsafe_text += " Thank you for learning with Eduface AI. If you have any questions, feel free to ask."
            
            calc_duration = max(8, len(failsafe_text) // 10)
            
            slide_script = f"""[SCENE START]
TEXT: "{failsafe_text}"
FACE: - slight smile
TIMING: - duration: {calc_duration}s"""
            
            try:
                print(f"  [AI] Narrating Slide {i+1}/{total}: '{title[:30]}...' ({len(clean_content)} chars)")
                generated = None
                
                # Priority 1: Groq API for flawless rule adherence
                if groq_api_key and Groq:
                    try:
                        client = Groq(api_key=groq_api_key)
                        response = client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=[
                                {"role": "system", "content": sys_prompt},
                                {"role": "user", "content": f"Generate the narration for Slide {i+1}."}
                            ],
                            temperature=0.2
                        )
                        if response.choices and len(response.choices) > 0:
                            generated = response.choices[0].message.content.strip()
                    except Exception as ge:
                        print(f"  [WARN] Groq generation failed: {ge}. Falling back to Ollama.")
                
                if not generated:
                    payload = {
                        "model": AI_MODEL,
                        "prompt": sys_prompt,
                        "stream": False,
                        "temperature": 0.2
                    }
                    response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=120)
                    if response.status_code == 200:
                        generated = response.json().get('response', '').strip()
                
                if generated and "[SCENE START]" in generated and "TEXT:" in generated:
                    if len(generated) > 50:
                        slide_script = generated
            except Exception as e:
                print(f"  [AI Fallback] Slide {i+1}: {e}")

            scripts.append(slide_script)

        return scripts