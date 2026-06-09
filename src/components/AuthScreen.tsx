import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Sparkles,
  KeyRound,
  UploadCloud
} from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Client Validation Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Helper to translate Supabase errors to Portuguese
  const translateError = (errMessage: string) => {
    const msg = errMessage.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (msg.includes('user already registered') || msg.includes('already exists')) {
      return 'Este endereço de e-mail já está cadastrado.';
    }
    if (msg.includes('password should be at least')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    if (msg.includes('signup is disabled')) {
      return 'O cadastro de novos usuários está desativado temporariamente.';
    }
    return errMessage;
  };

  const validateEmail = (emailStr: string) => {
    return /\S+@\S+\.\S+/.test(emailStr);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});

    const errors: Record<string, string> = {};

    // Basic Validations
    if (!email.trim()) {
      errors.email = 'O e-mail é obrigatório.';
    } else if (!validateEmail(email)) {
      errors.email = 'Formato de e-mail inválido.';
    }

    if (mode === 'login') {
      if (!password) {
        errors.password = 'A senha é obrigatória.';
      }
    }

    if (mode === 'register') {
      if (!name.trim()) {
        errors.name = 'O nome completo é obrigatório.';
      }
      if (!password) {
        errors.password = 'A senha é obrigatória.';
      } else if (password.length < 6) {
        errors.password = 'A senha deve ter pelo menos 6 caracteres.';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        
        onAuthSuccess();
      } else if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (authError) throw authError;

        // If user is auto-logged in, trigger success. Check if session exists.
        if (data.session) {
          setSuccessMessage('Conta criada com sucesso! Carregando...');
          setTimeout(() => {
            onAuthSuccess();
          }, 1500);
        } else {
          setSuccessMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
          // Reset fields
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          // Switch to login after a delay
          setTimeout(() => {
            setMode('login');
            setSuccessMessage(null);
          }, 5000);
        }
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });

        if (authError) throw authError;

        setSuccessMessage('Instruções de recuperação de senha enviadas para o seu e-mail!');
        setEmail('');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 5000);
      }
    } catch (err: any) {
      setError(translateError(err.message || 'Ocorreu um erro inesperado. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setValidationErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background font-sans p-4 md:p-8">
      {/* Central Login Card */}
      <div className="w-full max-w-5xl bg-[#ECEFF6]/40 rounded-[36px] border border-borderCustom shadow-cardShadow overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        
        {/* Left Column: Premium Branding Panel */}
        <div className="md:col-span-5 bg-[#23273A] relative overflow-hidden p-8 flex flex-col justify-between text-white border-r border-borderCustom/15">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/15 rounded-full blur-[120px] -ml-40 -mb-40 pointer-events-none" />
          
          {/* Logo / Branding top */}
          <div className="flex items-center space-x-3 z-10">
            <div className="h-11 w-11 rounded-[14px] bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <UploadCloud className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white select-none">NASA AUTO PEÇAS</span>
          </div>

          {/* Motivational / Content Area */}
          <div className="my-auto py-12 space-y-6 z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Gestão Inteligente</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight">
              Acelere a gestão de suas <span className="text-primary font-black">auto peças</span>
            </h1>
            <p className="text-sm text-textSecondary/90 max-w-xs leading-relaxed">
              Importação simplificada de arquivos XML, controle financeiro ágil e cadastros centralizados em um só lugar.
            </p>
          </div>

          {/* Footer of branding panel */}
          <div className="text-[10px] text-textSecondary/70 z-10 select-none">
            &copy; 2026 NASA Auto Peças. Todos os direitos reservados.
          </div>
        </div>

        {/* Right Column: Forms Panel */}
        <div className="md:col-span-7 bg-surface p-6 sm:p-10 md:p-12 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            
            {/* 1. LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Bem-vindo de volta</h2>
                  <p className="text-sm text-textSecondary mt-1">Acesse sua conta para continuar gerenciando a NASA.</p>
                </div>

                {/* Error/Success Alerts */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </div>
                )}
                
                {successMessage && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-green-700">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@empresa.com"
                        className={`w-full h-12 pl-12 pr-4 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                          validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                        }`}
                      />
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                    </div>
                    {validationErrors.email && (
                      <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.email}</span>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => changeMode('forgot')}
                        className="text-xs font-semibold text-primary hover:text-primary-hover focus:outline-none"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full h-12 pl-12 pr-12 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                          validationErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                        }`}
                      />
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-textSecondary/60 hover:text-textPrimary"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.password}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center space-x-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <span>Entrar no Sistema</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switch */}
                <div className="text-center pt-4 border-t border-borderCustom/60">
                  <span className="text-xs text-textSecondary">Não possui uma conta? </span>
                  <button
                    onClick={() => changeMode('register')}
                    className="text-xs font-bold text-primary hover:text-primary-hover focus:outline-none"
                  >
                    Criar nova conta
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. REGISTER MODE */}
            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => changeMode('login')}
                    className="p-2 bg-background hover:bg-borderCustom rounded-full transition-colors text-textSecondary hover:text-textPrimary"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Criar sua conta</h2>
                    <p className="text-sm text-textSecondary mt-0.5">Cadastre-se para obter acesso à plataforma.</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-green-700">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className={`w-full h-12 pl-12 pr-4 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                          validationErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                        }`}
                      />
                      <User className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                    </div>
                    {validationErrors.name && (
                      <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.name}</span>
                    )}
                  </div>

                  {/* Email Input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@empresa.com"
                        className={`w-full h-12 pl-12 pr-4 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                          validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                        }`}
                      />
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                    </div>
                    {validationErrors.email && (
                      <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.email}</span>
                    )}
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full h-12 pl-12 pr-12 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                            validationErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                          }`}
                        />
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-textSecondary/60 hover:text-textPrimary"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {validationErrors.password && (
                        <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.password}</span>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                        Confirmar Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full h-12 pl-12 pr-12 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                            validationErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                          }`}
                        />
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-3.5 text-textSecondary/60 hover:text-textPrimary"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.confirmPassword}</span>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center space-x-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <span>Criar Minha Conta</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switch */}
                <div className="text-center pt-4 border-t border-borderCustom/60">
                  <span className="text-xs text-textSecondary">Já possui uma conta? </span>
                  <button
                    onClick={() => changeMode('login')}
                    className="text-xs font-bold text-primary hover:text-primary-hover focus:outline-none"
                  >
                    Fazer Login
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => changeMode('login')}
                    className="p-2 bg-background hover:bg-borderCustom rounded-full transition-colors text-textSecondary hover:text-textPrimary"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Esqueceu sua senha?</h2>
                    <p className="text-sm text-textSecondary mt-0.5">Nós ajudamos você. Digite seu e-mail abaixo.</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-green-700">
                    <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-normal">{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      E-mail de Cadastro
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@empresa.com"
                        className={`w-full h-12 pl-12 pr-4 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${
                          validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                        }`}
                      />
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                    </div>
                    {validationErrors.email && (
                      <span className="text-xs text-red-500 font-medium pl-1">{validationErrors.email}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center space-x-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <KeyRound className="h-4.5 w-4.5" />
                        <span>Recuperar Senha</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switch */}
                <div className="text-center pt-4 border-t border-borderCustom/60">
                  <button
                    onClick={() => changeMode('login')}
                    className="text-xs font-bold text-primary hover:text-primary-hover focus:outline-none flex items-center justify-center mx-auto space-x-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Voltar para o Login</span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
