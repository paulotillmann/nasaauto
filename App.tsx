import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './src/lib/supabaseClient';
import { AuthScreen } from './src/components/AuthScreen';
import { sendDocumentEmail } from './src/lib/emailService';
import {
  Search,
  Settings,
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Briefcase,
  Users,
  DollarSign,
  Menu,
  X,
  Sparkles,
  Calendar,
  Layers,
  Code2,
  FileText,
  UserCheck,
  UploadCloud,
  Trash2,
  Download,
  Loader2,
  FileCode,
  File,
  Mail,
  MessageSquare,
  Pencil,
  LogOut,
  Camera,
  User
} from 'lucide-react';

// Interfaces para tipagem dos dados
interface Project {
  id: string;
  name: string;
  category: string;
  rate: string;
  status: 'Pago' | 'Em andamento' | 'Pendente' | 'Cancelado';
  description: string;
  location: string;
  timeAgo: string;
  tags: string[];
  iconType: 'web' | 'copy' | 'design';
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
  level: 'Sênior' | 'Pleno' | 'Júnior';
  avatar: string;
}

interface ImportedFile {
  id: string;
  cliente_id: string;
  nome_arquivo: string;
  tipo_arquivo: 'xml' | 'pdf';
  caminho_storage: string;
  tamanho_arquivo: number | null;
  created_at: string;
  enviado_email_at: string | null;
  enviado_whatsapp_at: string | null;
  clientes?: {
    nome: string;
    email: string;
    whatsapp: string;
  };
}

const monthsList = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getInitialDaysData = (month: number, year: number) => {
  const days = new Date(year, month + 1, 0).getDate();
  const list = [];
  for (let i = 1; i <= days; i++) {
    list.push({
      label: `${i}`,
      value: 0,
      labelFull: `${i} de ${monthsList[month]} de ${year}`,
    });
  }
  return list;
};

const App: React.FC = () => {
  // --- Estados de Autenticação ---
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- Estados do Dashboard ---
  const [activeChartBar, setActiveChartBar] = useState<number>(7); // Padrão: dia 8 (índice 7)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    'proj-1': true, // Primeiro projeto expandido por padrão
  });
  const [connectedUsers, setConnectedUsers] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCadastrosDropdown, setShowCadastrosDropdown] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState<string>('Início');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // --- Estados do Perfil ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState('');

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadAvatar = async () => {
      let avatarPath = session?.user?.user_metadata?.avatar_url;
      if (!avatarPath) {
        setResolvedAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80');
        return;
      }

      // Se for uma URL pública antiga apontando para o bucket privado arquivos_nfs_xml, converte de volta para o caminho de storage
      if (avatarPath.startsWith('http') && avatarPath.includes('/storage/v1/object/public/arquivos_nfs_xml/')) {
        avatarPath = avatarPath.split('/storage/v1/object/public/arquivos_nfs_xml/')[1];
      }

      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        setResolvedAvatarUrl(avatarPath);
      } else {
        // É um caminho relativo de storage, gera a URL assinada
        try {
          const { data, error } = await supabase.storage
            .from('arquivos_nfs_xml')
            .createSignedUrl(avatarPath, 60 * 60 * 24); // Válida por 24 horas

          if (error) {
            console.error('Erro ao gerar URL assinada para o avatar:', error);
            setResolvedAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80');
          } else if (data?.signedUrl) {
            setResolvedAvatarUrl(data.signedUrl);
          }
        } catch (err) {
          console.error('Erro ao resolver URL do avatar:', err);
          setResolvedAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80');
        }
      }
    };

    loadAvatar();
  }, [session?.user?.user_metadata?.avatar_url]);

  // --- Roteamento Interno ---
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'lista-clientes' | 'cadastro-clientes' | 'importar-nf-xml'>('dashboard');

  // --- Estados do Gráfico de Envios de E-mails ---
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Junho (0-indexed, ou seja, 5)
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Ano atual
  const [chartData, setChartData] = useState<{ label: string; value: number; labelFull: string }[]>(getInitialDaysData(5, 2026));
  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [monthlyXmlCount, setMonthlyXmlCount] = useState<number>(0);
  const [monthlyPdfCount, setMonthlyPdfCount] = useState<number>(0);
  const [monthlyTotalCount, setMonthlyTotalCount] = useState<number>(0);

  const fetchChartData = async (month: number, year: number) => {
    setLoadingChart(true);
    try {
      const list = getInitialDaysData(month, year);
      const startDate = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
      const endDate = new Date(year, month + 1, 1, 0, 0, 0, 0).toISOString();

      const { data, error } = await supabase
        .from('arquivos_importados')
        .select('enviado_email_at, tipo_arquivo')
        .not('enviado_email_at', 'is', null)
        .gte('enviado_email_at', startDate)
        .lt('enviado_email_at', endDate);

      if (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
      } else if (data) {
        data.forEach((item) => {
          if (item.enviado_email_at) {
            const date = new Date(item.enviado_email_at);
            const day = date.getDate();
            if (day >= 1 && day <= list.length) {
              list[day - 1].value += 1;
            }
          }
        });

        // Calcular quantidades mensais de XML e PDF enviados
        const xmls = data.filter(item => item.tipo_arquivo?.toLowerCase() === 'xml').length;
        const pdfs = data.filter(item => item.tipo_arquivo?.toLowerCase() === 'pdf').length;

        setMonthlyXmlCount(xmls);
        setMonthlyPdfCount(pdfs);
        setMonthlyTotalCount(xmls + pdfs);
      }
      setChartData(list);
    } catch (err) {
      console.error('Erro de conexão ao buscar dados do gráfico:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    if (session && currentScreen === 'dashboard') {
      fetchChartData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, session, currentScreen]);

  // --- Estados do Cadastro de Clientes ---
  const [clientNome, setClientNome] = useState('');
  const [clientEndereco, setClientEndereco] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [clientSuccess, setClientSuccess] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [lastClients, setLastClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showAllClients, setShowAllClients] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [totalClients, setTotalClients] = useState(0);

  // --- Estados da Lista de Clientes com Paginação ---
  const [searchListQuery, setSearchListQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [listClients, setListClients] = useState<any[]>([]);
  const [totalListClients, setTotalListClients] = useState(0);
  const [loadingListClients, setLoadingListClients] = useState(true);

  const fetchListClients = async (page = currentPage, search = searchListQuery) => {
    setLoadingListClients(true);
    try {
      const itemsPerPage = 12;
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('clientes')
        .select('id, nome, whatsapp, email, created_at, endereco', { count: 'exact' })
        .order('nome', { ascending: true });

      if (search.trim()) {
        const cleanSearch = search.trim();
        const cleanPhoneSearch = cleanSearch.replace(/\D/g, '');
        if (cleanPhoneSearch) {
          query = query.or(`nome.ilike.%${cleanSearch}%,whatsapp.like.%${cleanPhoneSearch}%`);
        } else {
          query = query.ilike('nome', `%${cleanSearch}%`);
        }
      }

      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Erro ao buscar lista de clientes:', error);
      } else {
        setListClients(data || []);
        if (count !== null) {
          setTotalListClients(count);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar lista de clientes:', err);
    } finally {
      setLoadingListClients(false);
    }
  };

  const handleSearchListChange = (val: string) => {
    setSearchListQuery(val);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (currentScreen === 'lista-clientes') {
      const handler = setTimeout(() => {
        fetchListClients(currentPage, searchListQuery);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [currentScreen, currentPage, searchListQuery]);

  // --- Estados de Importação de Arquivos ---
  const [importClients, setImportClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [showClientSuggestions, setShowClientSuggestions] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string>('Arquivo importado com sucesso!');
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [loadingImportedFiles, setLoadingImportedFiles] = useState<boolean>(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);

  // --- Estados do Sub-menu de Importação ---
  const [importSubScreen, setImportSubScreen] = useState<'list' | 'form'>('list');
  const [clientsWithSubmissions, setClientsWithSubmissions] = useState<any[]>([]);
  const [searchClientWithSubmissions, setSearchClientWithSubmissions] = useState('');
  const [loadingClientsWithSubmissions, setLoadingClientsWithSubmissions] = useState(false);
  const [importClientsPage, setImportClientsPage] = useState(1);
  const [totalImportClientsCount, setTotalImportClientsCount] = useState(0);

  // O gráfico agora utiliza o estado chartData carregado do Supabase

  // Projetos Recentes
  const projectsData: Project[] = [
    {
      id: 'proj-1',
      name: 'Projeto de Desenvolvimento Web',
      category: 'Desenvolvimento',
      rate: '$10/hora',
      status: 'Pago',
      description: 'Este projeto envolve a implementação de funcionalidades de frontend e backend, bem como a integração com APIs de terceiros.',
      location: 'Alemanha',
      timeAgo: 'Há 2 horas',
      tags: ['Remoto', 'Meio Período'],
      iconType: 'web',
    },
    {
      id: 'proj-2',
      name: 'Projeto de Redação e Copy',
      category: 'Redação',
      rate: '$10/hora',
      status: 'Pendente',
      description: 'Criação de textos persuasivos e otimizados para SEO para as páginas de vendas de um produto SaaS de segurança cibernética.',
      location: 'Estados Unidos',
      timeAgo: 'Há 1 dia',
      tags: ['Contrato', 'Por Hora'],
      iconType: 'copy',
    },
    {
      id: 'proj-3',
      name: 'Projeto de Web Design',
      category: 'Design UI/UX',
      rate: '$10/hora',
      status: 'Pago',
      description: 'Redesenho completo da interface do usuário da plataforma mobile e web, focando em simplicidade e alto contraste de cores.',
      location: 'Canadá',
      timeAgo: 'Há 3 dias',
      tags: ['Freelance', 'Período Integral'],
      iconType: 'design',
    },
  ];

  // Profissionais Recomendados (Vamos nos Conectar)
  const professionals: Professional[] = [
    {
      id: 'prof-1',
      name: 'Randy Gouse',
      specialty: 'Especialista em Cibersegurança',
      level: 'Sênior',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    },
    {
      id: 'prof-2',
      name: 'Giana Schleifer',
      specialty: 'Designer UX/UI',
      level: 'Pleno',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    },
  ];

  // Toggle do Accordion dos Projetos
  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle Conexão de Profissionais
  const toggleConnect = (id: string) => {
    setConnectedUsers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Obter o valor atual com base no período selecionado
  const safeActiveBarIndex = Math.min(activeChartBar, chartData.length - 1);
  const activeValue = chartData[safeActiveBarIndex]?.value || 0;
  const activeLabel = chartData[safeActiveBarIndex]?.labelFull || '';

  // Renderizar ícones do projeto correspondente
  const renderProjectIcon = (type: 'web' | 'copy' | 'design') => {
    switch (type) {
      case 'web':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary text-white shadow-sm">
            <Code2 className="h-6 w-6" />
          </div>
        );
      case 'copy':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-textPrimary text-white shadow-sm">
            <FileText className="h-6 w-6" />
          </div>
        );
      case 'design':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-secondary text-white shadow-sm">
            <Layers className="h-6 w-6" />
          </div>
        );
    }
  };

  // Badge de Status do Projeto
  const renderStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'Pago':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-badge bg-textPrimary text-white">
            Pago
          </span>
        );
      case 'Em andamento':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-badge bg-blue-500 text-white">
            Em andamento
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-badge bg-[#F4F6FA] text-textSecondary border border-border">
            Pendente
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-badge bg-red-500 text-white">
            Cancelado
          </span>
        );
    }
  };

  // Cálculo das posições do gráfico
  const maxVal = Math.max(1, ...chartData.map((d) => d.value));

  const fetchLastClients = async (showAll = showAllClients, search = searchQuery) => {
    setLoadingClients(true);
    try {
      let query = supabase
        .from('clientes')
        .select('id, nome, whatsapp, email, created_at, endereco', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('nome', `%${search.trim()}%`);
      }

      if (!showAll) {
        query = query.limit(5);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error('Erro ao buscar clientes:', error);
      } else {
        setLastClients(data || []);
        if (count !== null) {
          setTotalClients(count);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const handler = setTimeout(() => {
      fetchLastClients(showAllClients, searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [showAllClients, searchQuery, session]);

  const formatWhatsapp = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return val;
  };

  // --- Funções do Cadastro de Clientes ---
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos

    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    setClientWhatsapp(value);
  };

  const validateClientForm = () => {
    const errors: Record<string, string> = {};

    if (!clientNome.trim()) {
      errors.nome = 'O nome completo é obrigatório.';
    }

    const rawWhatsapp = clientWhatsapp.replace(/\D/g, '');
    if (!rawWhatsapp) {
      errors.whatsapp = 'O WhatsApp é obrigatório.';
    } else if (rawWhatsapp.length < 10) {
      errors.whatsapp = 'Por favor, insira um número de WhatsApp válido.';
    }

    if (!clientEmail.trim()) {
      errors.email = 'O e-mail é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(clientEmail)) {
      errors.email = 'Por favor, insira um endereço de e-mail válido.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClientClick = (client: any) => {
    setEditingClient(client);
    setClientNome(client.nome || '');
    setClientEndereco(client.endereco || '');
    setClientWhatsapp(formatWhatsapp(client.whatsapp || ''));
    setClientEmail(client.email || '');
    setClientErrors({});
    setClientSuccess(false);
    setCurrentScreen('cadastro-clientes');
    setActiveNavItem('Cadastros');
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClientForm()) return;

    setClientSaving(true);
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome: clientNome.toUpperCase().trim(),
            endereco: clientEndereco ? clientEndereco.toUpperCase().trim() : null,
            whatsapp: clientWhatsapp.replace(/\D/g, ''),
            email: clientEmail.toLowerCase().trim(),
          })
          .eq('id', editingClient.id);

        if (error) {
          setClientErrors({ dbError: error.message });
        } else {
          setClientSuccess(true);
          fetchLastClients();
          setEditingClient(null);
          setClientNome('');
          setClientEndereco('');
          setClientWhatsapp('');
          setClientEmail('');
          setClientErrors({});

          setTimeout(() => {
            setClientSuccess(false);
            setCurrentScreen('lista-clientes');
          }, 2000);
        }
      } else {
        const { error } = await supabase.from('clientes').insert([
          {
            nome: clientNome.toUpperCase().trim(),
            endereco: clientEndereco ? clientEndereco.toUpperCase().trim() : null,
            whatsapp: clientWhatsapp.replace(/\D/g, ''), // Salva apenas os números no banco
            email: clientEmail.toLowerCase().trim(),
          }
        ]);

        if (error) {
          setClientErrors({ dbError: error.message });
        } else {
          setClientSuccess(true);
          fetchLastClients();
          fetchListClients(currentPage, searchListQuery);
          // Limpa os campos
          setClientNome('');
          setClientEndereco('');
          setClientWhatsapp('');
          setClientEmail('');
          setClientErrors({});

          setTimeout(() => {
            setClientSuccess(false);
            setCurrentScreen('lista-clientes');
          }, 2000);
        }
      }
    } catch (err: any) {
      setClientErrors({ dbError: err.message || 'Erro de conexão com o banco de dados.' });
    } finally {
      setClientSaving(false);
    }
  };

  // --- Funções Auxiliares de Formatação ---
  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatImportDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- Funções da Importação de Arquivos ---
  const fetchImportClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar clientes para importação:', error);
      } else {
        setImportClients(data || []);
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar clientes:', err);
    }
  };

  const fetchImportedFiles = async (clientId: string) => {
    if (!clientId) {
      setImportedFiles([]);
      return;
    }
    setLoadingImportedFiles(true);
    try {
      const { data, error } = await supabase
        .from('arquivos_importados')
        .select('*, clientes(nome, email, whatsapp)')
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar arquivos importados:', error);
        setImportError('Erro ao carregar o histórico de arquivos.');
      } else {
        setImportedFiles(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar arquivos importados:', err);
      setImportError('Erro de conexão ao buscar histórico de arquivos.');
    } finally {
      setLoadingImportedFiles(false);
    }
  };

  const fetchClientsWithSubmissions = async (page = importClientsPage, search = searchClientWithSubmissions) => {
    setLoadingClientsWithSubmissions(true);
    try {
      const itemsPerPage = 12;
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('clientes')
        .select('id, nome, email, whatsapp, arquivos_importados!inner(id, tipo_arquivo)', { count: 'exact' })
        .order('nome', { ascending: true });

      if (search.trim()) {
        query = query.ilike('nome', `%${search.trim()}%`);
      }

      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Erro ao buscar clientes com envios:', error);
      } else {
        setClientsWithSubmissions(data || []);
        if (count !== null) {
          setTotalImportClientsCount(count);
        }
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar clientes com envios:', err);
    } finally {
      setLoadingClientsWithSubmissions(false);
    }
  };

  const handleSearchClientWithSubmissionsChange = (val: string) => {
    setSearchClientWithSubmissions(val);
    setImportClientsPage(1);
  };

  useEffect(() => {
    if (currentScreen === 'importar-nf-xml' && importSubScreen === 'list') {
      const handler = setTimeout(() => {
        fetchClientsWithSubmissions(importClientsPage, searchClientWithSubmissions);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [currentScreen, importSubScreen, importClientsPage, searchClientWithSubmissions]);

  useEffect(() => {
    if (currentScreen === 'importar-nf-xml') {
      fetchImportClients();
      setImportFile(null);
      setImportSuccess(false);
      setImportError(null);
      setSelectedClientId('');
      setClientSearchTerm('');
      setImportedFiles([]);
      setImportSubScreen('list');
      setImportClientsPage(1);
    }
  }, [currentScreen]);

  useEffect(() => {
    if (selectedClientId) {
      fetchImportedFiles(selectedClientId);
    } else {
      setImportedFiles([]);
    }
  }, [selectedClientId]);

  const handleImportFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(false);

    if (!selectedClientId) {
      setImportError('Por favor, selecione um cliente.');
      return;
    }
    if (!importFile) {
      setImportError('Por favor, selecione ou arraste um arquivo XML ou PDF.');
      return;
    }

    const fileExt = importFile.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'xml' && fileExt !== 'pdf') {
      setImportError('Apenas arquivos XML ou PDF são permitidos.');
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (importFile.size > maxSizeBytes) {
      setImportError('O tamanho do arquivo excede o limite permitido de 10MB.');
      return;
    }

    setImporting(true);
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 7);
      const sanitizedName = importFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${selectedClientId}/${timestamp}-${randomStr}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('arquivos_nfs_xml')
        .upload(storagePath, importFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro de upload no Storage:', uploadError);
        throw new Error(`Erro ao enviar arquivo para o Storage: ${uploadError.message}`);
      }

      const { error: dbError } = await supabase
        .from('arquivos_importados')
        .insert([
          {
            cliente_id: selectedClientId,
            nome_arquivo: importFile.name,
            tipo_arquivo: fileExt as 'xml' | 'pdf',
            caminho_storage: storagePath,
            tamanho_arquivo: importFile.size,
          }
        ]);

      if (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Tenta limpar o arquivo do storage caso a gravação no banco falhe
        await supabase.storage.from('arquivos_nfs_xml').remove([storagePath]);
        throw new Error(`Erro ao registrar arquivo no banco de dados: ${dbError.message}`);
      }

      setImportSuccessMessage('Arquivo importado com sucesso!');
      setImportSuccess(true);
      setImportFile(null);
      await fetchImportedFiles(selectedClientId);

      setTimeout(() => {
        setImportSuccess(false);
      }, 4000);
    } catch (err: any) {
      setImportError(err.message || 'Ocorreu um erro ao importar o arquivo.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteImportedFile = async (fileId: string, storagePath: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo importado?')) {
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('arquivos_nfs_xml')
        .remove([storagePath]);

      if (storageError) {
        console.error('Erro ao excluir do Storage:', storageError);
      }

      const { error: dbError } = await supabase
        .from('arquivos_importados')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Erro ao excluir do banco:', dbError);
        setImportError('Erro ao excluir registro no banco de dados.');
      } else {
        if (selectedClientId) {
          fetchImportedFiles(selectedClientId);
        }
      }
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
      setImportError('Erro ao processar exclusão do arquivo.');
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('arquivos_nfs_xml')
        .createSignedUrl(storagePath, 60);

      if (error) {
        console.error('Erro ao criar URL assinada:', error);
        const { data: publicUrlData } = supabase.storage
          .from('arquivos_nfs_xml')
          .getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          window.open(publicUrlData.publicUrl, '_blank');
        } else {
          alert('Não foi possível obter a URL do arquivo.');
        }
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      alert('Erro de conexão ao baixar o arquivo.');
    }
  };

  const handleSendEmail = async (file: ImportedFile) => {
    const clientEmail = file.clientes?.email;
    const clientName = file.clientes?.nome;

    if (!clientEmail) {
      setImportError('Este cliente não possui e-mail cadastrado.');
      return;
    }

    setSendingEmailId(file.id);
    setImportError(null);
    setImportSuccess(false);

    try {
      // 1. Obter URL do arquivo (signed link válido por 24 horas)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('arquivos_nfs_xml')
        .createSignedUrl(file.caminho_storage, 60 * 60 * 24);

      if (urlError || !urlData?.signedUrl) {
        throw new Error(`Erro ao obter link do arquivo: ${urlError?.message || 'URL inválida'}`);
      }

      // 2. Chamar o serviço de email
      const result = await sendDocumentEmail({
        to: clientEmail,
        nomeColaborador: clientName || 'Cliente NASA',
        tipoDocumento: file.tipo_arquivo === 'xml' ? 'informe' : 'holerite',
        periodoReferencia: formatImportDate(file.created_at),
        cpf: file.clientes?.whatsapp || '-',
        pdfUrl: urlData.signedUrl,
        nomeEmpresa: 'NASA AUTO PEÇAS',
        nomeArquivo: file.nome_arquivo,
        tipoArquivo: file.tipo_arquivo
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao disparar e-mail.');
      }

      // 3. Registrar no banco de dados a data/hora do envio
      const now = new Date().toISOString();
      const { data: updatedRows, error: dbError } = await supabase
        .from('arquivos_importados')
        .update({ enviado_email_at: now })
        .eq('id', file.id)
        .select();

      if (dbError) {
        console.error('Erro ao registrar data/hora de envio por email:', dbError);
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('O envio foi realizado, mas o banco de dados não permitiu atualizar o status (Erro de política RLS para UPDATE na tabela arquivos_importados).');
      }

      setImportSuccessMessage('Arquivo enviado para o e-mail do cliente!');
      setImportSuccess(true);
      if (selectedClientId) {
        await fetchImportedFiles(selectedClientId);
      }
      fetchChartData(selectedMonth, selectedYear);

      setTimeout(() => {
        setImportSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error('Erro ao enviar email:', err);
      setImportError(err.message || 'Ocorreu um erro ao enviar o e-mail.');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleSendWhatsapp = async (file: ImportedFile) => {
    const clientWhatsapp = file.clientes?.whatsapp;

    if (!clientWhatsapp) {
      setImportError('Este cliente não possui WhatsApp cadastrado.');
      return;
    }

    setSendingWhatsappId(file.id);
    setImportError(null);
    setImportSuccess(false);

    try {
      const now = new Date().toISOString();
      const { data: updatedRows, error: dbError } = await supabase
        .from('arquivos_importados')
        .update({ enviado_whatsapp_at: now })
        .eq('id', file.id)
        .select();

      if (dbError) {
        throw new Error(dbError.message);
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('O banco de dados não permitiu atualizar o status (Erro de política RLS para UPDATE na tabela arquivos_importados).');
      }

      // Abre link de envio do whatsapp
      const messageText = `Olá! Segue o seu arquivo importado: ${file.nome_arquivo}`;
      const encodedText = encodeURIComponent(messageText);
      window.open(`https://wa.me/55${clientWhatsapp.replace(/\D/g, '')}?text=${encodedText}`, '_blank');

      setImportSuccessMessage('Link do WhatsApp aberto com sucesso!');
      setImportSuccess(true);
      if (selectedClientId) {
        await fetchImportedFiles(selectedClientId);
      }

      setTimeout(() => {
        setImportSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error('Erro ao simular envio de WhatsApp:', err);
      setImportError(`Erro ao registrar envio por WhatsApp: ${err.message}`);
    } finally {
      setSendingWhatsappId(null);
    }
  };

  const handleOpenProfileModal = () => {
    setProfileName(session?.user?.user_metadata?.full_name || '');
    setProfileImageUrl(resolvedAvatarUrl);
    setProfileImageFile(null);
    setProfileError(null);
    setProfileSuccess(false);
    setShowProfileModal(true);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setProfileError('A imagem deve ter no máximo 2MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setProfileError('O arquivo selecionado deve ser uma imagem.');
        return;
      }
      setProfileImageFile(file);
      setProfileError(null);
      const localUrl = URL.createObjectURL(file);
      setProfileImageUrl(localUrl);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError('O nome não pode estar vazio.');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      let finalAvatarUrl = session?.user?.user_metadata?.avatar_url || '';

      if (profileImageFile) {
        const fileExt = profileImageFile.name.split('.').pop();
        const userId = session?.user?.id;
        const timestamp = Date.now();
        const filePath = `avatars/${userId}-${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('arquivos_nfs_xml')
          .upload(filePath, profileImageFile, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Erro ao enviar imagem: ${uploadError.message}`);
        }

        finalAvatarUrl = filePath;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profileName.trim(),
          avatar_url: finalAvatarUrl,
        },
      });

      if (updateError) {
        throw updateError;
      }

      setSession((prevSession: any) => {
        if (!prevSession) return prevSession;
        return {
          ...prevSession,
          user: {
            ...prevSession.user,
            user_metadata: {
              ...prevSession.user.user_metadata,
              full_name: profileName.trim(),
              avatar_url: finalAvatarUrl,
            }
          }
        };
      });

      setProfileSuccess(true);
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      setProfileError(err.message || 'Erro ao salvar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background font-sans">
        <div className="h-16 w-16 rounded-[20px] bg-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse mb-4">
          <UploadCloud className="h-9 w-9 text-white animate-pulse" />
        </div>
        <div className="text-sm font-semibold text-textPrimary animate-pulse">Carregando NASA...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        onAuthSuccess={async () => {
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#ECEFF6]/40 font-sans antialiased text-textPrimary selection:bg-primary/20 p-0 md:py-[4px] md:px-6 lg:py-[4px] lg:px-8">

      {/* Container Principal Centralizado com visual Premium e borda arredondada estilo Desktop Canvas */}
      <div className="max-w-[1520px] mx-auto rounded-[36px] overflow-hidden p-4 md:p-8">

        {/* ======================================================== */}
        {/* HEADER (Altura: 80px)                                    */}
        {/* ======================================================== */}
        <header className="h-20 w-full flex items-center justify-between border-b border-borderCustom/60 pb-4 mb-[4px]">

          {/* Logo e Nome da Plataforma */}
          <div
            onClick={() => {
              setCurrentScreen('dashboard');
              setActiveNavItem('Início');
              setShowCadastrosDropdown(false);
            }}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="h-11 w-11 rounded-[14px] bg-primary flex items-center justify-center shadow-md shadow-primary/20 hover:scale-105 transition-transform duration-200">
              <UploadCloud className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-textPrimary select-none">NASA AUTO PEÇAS</span>
          </div>

          {/* Menu Principal (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-8">
            {[
              { key: 'Início', label: 'Início' },
              { key: 'Cadastros', label: 'Cadastros', hasDropdown: true },
              { key: 'Importar NF e XML', label: 'Importar NF e XML' }
            ].map((item) => {
              if (item.hasDropdown) {
                const isActive = activeNavItem === item.key;
                return (
                  <div key={item.key} className="relative">
                    <button
                      onClick={() => {
                        setShowCadastrosDropdown(!showCadastrosDropdown);
                        setActiveNavItem(item.key);
                      }}
                      className={`text-sm font-medium transition-all duration-200 py-2 flex items-center space-x-1 focus:outline-none relative ${isActive
                        ? 'text-textPrimary font-semibold'
                        : 'text-textSecondary hover:text-textPrimary'
                        }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCadastrosDropdown ? 'rotate-180' : ''}`} />
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                    <AnimatePresence>
                      {showCadastrosDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 mt-2 w-40 bg-surface border border-borderCustom rounded-card shadow-dropdownShadow overflow-hidden z-30 p-2"
                        >
                          <a
                            href="#clientes"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowCadastrosDropdown(false);
                              setEditingClient(null);
                              setClientNome('');
                              setClientEndereco('');
                              setClientWhatsapp('');
                              setClientEmail('');
                              setClientErrors({});
                              setCurrentScreen('lista-clientes');
                              setActiveNavItem('Cadastros');
                            }}
                            className="block w-full text-left px-4 py-2.5 text-sm text-textSecondary hover:text-textPrimary hover:bg-background rounded-xl transition-colors font-medium"
                          >
                            Clientes
                          </a>
                          <a href="#fornecedores" onClick={() => setShowCadastrosDropdown(false)} className="block w-full text-left px-4 py-2.5 text-sm text-textSecondary hover:text-textPrimary hover:bg-background rounded-xl transition-colors font-medium">
                            Fornecedores
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              const isActive = activeNavItem === item.key;
              return (
                <a
                  key={item.key}
                  href={`#${item.key.toLowerCase()}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.key === 'Início') {
                      setCurrentScreen('dashboard');
                    } else if (item.key === 'Importar NF e XML') {
                      setCurrentScreen('importar-nf-xml');
                      setImportSubScreen('list');
                    }
                    setActiveNavItem(item.key);
                    setShowCadastrosDropdown(false);
                  }}
                  className={`text-sm font-medium transition-all duration-200 relative py-2 ${isActive
                    ? 'text-textPrimary font-semibold'
                    : 'text-textSecondary hover:text-textPrimary'
                    }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Barra de Pesquisa e Ícones de Perfil/Configuração */}
          <div className="flex items-center space-x-4">

            {/* Campo de Busca */}
            <div className="relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca por nome do Cliente"
                className="w-[280px] h-12 pl-12 pr-4 text-sm bg-surface border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/60 shadow-sm"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
            </div>

            {/* Ações Rápidas */}
            <div className="flex items-center space-x-2">

              {/* Botão de Menu Responsivo (Mobile) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-3 bg-surface hover:bg-background border border-borderCustom rounded-full shadow-sm text-textSecondary hover:text-textPrimary"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>

            {/* Informações do Usuário e Avatar */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-textPrimary leading-tight truncate max-w-[150px]" title={session?.user?.user_metadata?.full_name || 'Usuário NASA'}>
                  {session?.user?.user_metadata?.full_name || 'Usuário NASA'}
                </span>
                <span className="text-[10px] text-textSecondary truncate max-w-[120px]" title={session?.user?.email}>
                  {session?.user?.email}
                </span>
              </div>
              <div 
                onClick={handleOpenProfileModal}
                className="relative cursor-pointer group"
                title="Editar perfil"
              >
                <div className="h-12 w-12 rounded-full overflow-hidden border border-borderCustom shadow-sm hover:ring-2 hover:ring-primary transition-all duration-200">
                  <img
                    src={resolvedAvatarUrl}
                    alt="Avatar do perfil do usuário"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Botão de Sair do Sistema */}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-3 bg-surface hover:bg-red-50 hover:text-red-600 border border-borderCustom rounded-full transition-transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 duration-200 shadow-sm text-textSecondary"
                title="Sair do sistema"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

          </div>
        </header>

        {/* Menu Mobile Expandido */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-b border-borderCustom/60 pb-6 mb-6 overflow-hidden flex flex-col space-y-3"
            >
              <div className="relative mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca por nome do Cliente"
                  className="w-full h-12 pl-12 pr-4 text-sm bg-surface border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/60 shadow-sm"
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
              </div>
              {[
                { key: 'Início', label: 'Início' },
                { key: 'Cadastros', label: 'Cadastros', hasDropdown: true },
                { key: 'Importar NF e XML', label: 'Importar NF e XML' }
              ].map((item) => {
                if (item.hasDropdown) {
                  const isMobileActive = activeNavItem === item.key;
                  return (
                    <div key={item.key} className="flex flex-col">
                      <button
                        onClick={() => {
                          setShowCadastrosDropdown(!showCadastrosDropdown);
                          setActiveNavItem(item.key);
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between focus:outline-none ${isMobileActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-textSecondary hover:bg-surface hover:text-textPrimary'
                          }`}
                      >
                        <span>{item.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCadastrosDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {showCadastrosDropdown && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-6 flex flex-col space-y-1 mt-1"
                          >
                            <a
                              href="#clientes"
                              onClick={(e) => {
                                e.preventDefault();
                                setMobileMenuOpen(false);
                                setShowCadastrosDropdown(false);
                                setEditingClient(null);
                                setClientNome('');
                                setClientEndereco('');
                                setClientWhatsapp('');
                                setClientEmail('');
                                setClientErrors({});
                                setCurrentScreen('lista-clientes');
                                setActiveNavItem('Cadastros');
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-medium text-textSecondary hover:bg-surface hover:text-textPrimary"
                            >
                              Clientes
                            </a>
                            <a
                              href="#fornecedores"
                              onClick={() => { setMobileMenuOpen(false); setShowCadastrosDropdown(false); }}
                              className="px-4 py-2 rounded-xl text-xs font-medium text-textSecondary hover:bg-surface hover:text-textPrimary"
                            >
                              Fornecedores
                            </a>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                const isMobileActive = activeNavItem === item.key;
                return (
                  <a
                    key={item.key}
                    href={`#${item.key.toLowerCase()}`}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.key === 'Início') {
                        setCurrentScreen('dashboard');
                      } else if (item.key === 'Importar NF e XML') {
                        setCurrentScreen('importar-nf-xml');
                        setImportSubScreen('list');
                      }
                      setActiveNavItem(item.key);
                      setShowCadastrosDropdown(false);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isMobileActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-textSecondary hover:bg-surface hover:text-textPrimary'
                      }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* ÁREA PRINCIPAL                                           */}
        {/* ======================================================== */}
        <AnimatePresence mode="wait">
          {currentScreen === 'dashboard' && (
            <motion.main
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-10 gap-8"
            >

              {/* -------------------------------------------------------- */}
              {/* COLUNA ESQUERDA (70% -> 7 slots do grid)                */}
              {/* -------------------------------------------------------- */}
              <section className="lg:col-span-7 flex flex-col space-y-8">

                {/* CARD PRINCIPAL: INCOME TRACKER                          */}
                <div className="bg-surface rounded-card border border-borderCustom p-6 md:p-8 hover:shadow-cardShadow transition-shadow duration-300 relative overflow-hidden group">

                  {/* Linha de Cima: Título, Ícone e Filtro de Período */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-start space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-background text-textSecondary border border-borderCustom">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Envios de E-mails por Dia</h2>
                        <p className="text-sm text-textSecondary mt-1 max-w-md">
                          Acompanhe a quantidade de documentos enviados por e-mail para seus clientes no mês selecionado
                        </p>
                      </div>
                    </div>

                    {/* Seletor de Mês (Estilo do Anexo: September' 2021 < • >) */}
                    <div className="flex items-center space-x-4 self-end sm:self-center">
                      <span className="text-md md:text-lg font-bold tracking-tight text-textPrimary select-none">
                        {monthsList[selectedMonth]}' {selectedYear}
                      </span>
                      <div className="flex items-center space-x-1.5 bg-background border border-borderCustom rounded-btn p-1.5 shadow-sm">
                        <button
                          onClick={() => {
                            if (selectedMonth === 0) {
                              setSelectedMonth(11);
                              setSelectedYear(selectedYear - 1);
                            } else {
                              setSelectedMonth(selectedMonth - 1);
                            }
                            setActiveChartBar(0);
                          }}
                          className="p-1.5 hover:bg-surface rounded-full text-textSecondary hover:text-textPrimary transition-all duration-150 focus:outline-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            setSelectedMonth(now.getMonth());
                            setSelectedYear(now.getFullYear());
                            setActiveChartBar(now.getDate() - 1);
                          }}
                          className="p-2 hover:bg-surface rounded-full text-textSecondary hover:text-primary transition-all duration-150 focus:outline-none flex items-center justify-center hover:scale-110"
                        >
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        </button>
                        <button
                          onClick={() => {
                            if (selectedMonth === 11) {
                              setSelectedMonth(0);
                              setSelectedYear(selectedYear + 1);
                            } else {
                              setSelectedMonth(selectedMonth + 1);
                            }
                            setActiveChartBar(0);
                          }}
                          className="p-1.5 hover:bg-surface rounded-full text-textSecondary hover:text-textPrimary transition-all duration-150 focus:outline-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Card: Valor Principal + Gráfico */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mt-[4px]">

                    {/* Gráfico SVG customizado estilo Linha com Pontos (Mockup) */}
                    <div className="md:col-span-12 flex flex-col items-center justify-end relative h-[218px]">

                      {/* Spinner de Carregamento Premium */}
                      {loadingChart && (
                        <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}

                      {/* Tooltip flutuante sobre a coluna ativa */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${selectedMonth}-${selectedYear}-${activeChartBar}`}
                          initial={{ opacity: 0, y: -10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.9 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="absolute bg-textPrimary text-white text-xs font-bold px-4 py-2.5 rounded-[12px] shadow-lg flex flex-col items-center z-10"
                          style={{
                            top: `calc(${110 - (activeValue / maxVal) * 70}px - 35px)`,
                            left: `calc(${(safeActiveBarIndex / (chartData.length - 1)) * 100}% - 24px)`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <span className="text-[10px] text-textSecondary font-medium leading-none mb-1">
                            {activeLabel}
                          </span>
                          <span className="text-sm font-semibold">
                            {activeValue === 1 ? '1 envio' : `${activeValue} envios`}
                          </span>
                          {/* Seta do Tooltip */}
                          <div className="w-2.5 h-2.5 bg-textPrimary rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                        </motion.div>
                      </AnimatePresence>

                      {/* Canvas de Barras / Linhas Verticais */}
                      <div className="w-full h-[106px] flex justify-between items-end px-2 md:px-6 relative">

                        {/* Linhas de Grade de Fundo */}
                        <div className="absolute inset-x-0 bottom-0 top-6 border-b border-borderCustom/40 flex flex-col justify-between pointer-events-none">
                          <div className="w-full border-t border-dashed border-borderCustom/30" />
                          <div className="w-full border-t border-dashed border-borderCustom/30" />
                          <div className="w-full border-t border-dashed border-borderCustom/30" />
                        </div>

                        {chartData.map((d, index) => {
                          const isActive = index === safeActiveBarIndex;
                          const pct = d.value / maxVal;
                          const barHeight = pct * 70; // max 70px

                          return (
                            <div
                              key={d.label}
                              className="flex flex-col items-center flex-1 relative group/col cursor-pointer min-w-0"
                              onMouseEnter={() => setActiveChartBar(index)}
                            >
                              {/* Coluna de seleção invisível larga para facilitar hover */}
                              <div className="absolute top-0 bottom-0 w-full hover:bg-black/0 cursor-pointer z-0" />

                              {/* Destaque de coluna ativa (coluna branca leve de fundo) */}
                              {isActive && (
                                <motion.div
                                  layoutId="activeColBg"
                                  className="absolute -top-6 bottom-0 w-7 md:w-9 bg-[#F4F6FA] border border-borderCustom/30 rounded-[24px] z-0"
                                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                              )}

                              {/* Render da Linha Vertical e do Ponto Azul */}
                              <div className="flex flex-col items-center justify-end relative h-40 w-full z-10">

                                {/* Ponto azul no topo da linha */}
                                <motion.div
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: isActive ? 1.3 : 1 }}
                                  className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border border-surface shadow-sm mb-[-4px] transition-colors duration-200 ${isActive
                                    ? 'bg-primary border-surface scale-125'
                                    : 'bg-[#7FA6D9] border-surface'
                                    }`}
                                  style={{ bottom: `${barHeight}px` }}
                                />

                                {/* A linha vertical fina cinza do gráfico */}
                                <div
                                  className={`w-[1px] md:w-[1.5px] transition-colors duration-200 ${isActive ? 'bg-primary/55' : 'bg-borderCustom/80'
                                    }`}
                                  style={{ height: `${barHeight}px` }}
                                />

                              </div>

                              {/* Badge do Dia / Label no rodapé (Reduzido em mobile para não embolar) */}
                              <div className="mt-3 z-10">
                                <span
                                  className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center text-[9px] md:text-xs font-semibold select-none transition-all duration-200 ${isActive
                                    ? 'bg-textPrimary text-white shadow-sm'
                                    : 'text-textSecondary group-hover/col:text-textPrimary'
                                    } ${index % 3 !== 0 && !isActive ? 'hidden md:flex' : 'flex'
                                    }`}
                                >
                                  {d.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                      </div>

                    </div>

                  </div>

                </div>

                {/* GRADE INFERIOR: LET'S CONNECT E PROPOSAL PROGRESS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* CARD 1: PROPOSAL PROGRESS                                */}
                  <div className="bg-surface rounded-card border border-borderCustom p-6 hover:shadow-cardShadow transition-shadow duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold tracking-tight text-textPrimary">Arquivo enviados</h3>
                      </div>

                      {/* Números e Barras de Progresso Verticais Customizadas */}
                      <div className="grid grid-cols-3 gap-3 border-b border-borderCustom/60 pb-4 mb-4">

                        {/* Proposals */}
                        <div className="flex flex-col">
                          <span className="text-[10px] text-textSecondary leading-none">Arquivos XML</span>
                          <span className="text-2xl font-extrabold text-blue-500 mt-1.5">{monthlyXmlCount}</span>
                        </div>

                        {/* Interviews */}
                        <div className="flex flex-col border-l border-borderCustom/60 pl-3">
                          <span className="text-[10px] text-textSecondary leading-none font-medium">Arquivos NFs</span>
                          <span className="text-2xl font-extrabold text-primary mt-1.5">{monthlyPdfCount}</span>
                        </div>

                        {/* Hires */}
                        <div className="flex flex-col border-l border-borderCustom/60 pl-3">
                          <span className="text-[10px] text-textSecondary leading-none">Totais</span>
                          <span className="text-2xl font-extrabold text-textPrimary mt-1.5">{monthlyTotalCount}</span>
                        </div>

                      </div>

                      {/* Visualização de barras de tick estilizadas abaixo das métricas (estilo medidor analógico do mockup) */}
                      <div className="grid grid-cols-3 gap-3 h-10 items-end px-1">

                        {/* Ticks XML: Coloridos em Azul */}
                        <div className="flex space-x-[2px] justify-start h-full items-end">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const activeTicks = Math.min(14, monthlyXmlCount);
                            return (
                              <div
                                key={i}
                                className={`w-[1.5px] rounded-full transition-colors duration-200`}
                                style={{
                                  height: `${20 + (i % 3) * 6}%`,
                                  backgroundColor: i < activeTicks ? '#3B82F6' : '#E8ECF4'
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Ticks PDFs: Coloridos Vermelho-Alaranjado */}
                        <div className="flex space-x-[2px] justify-start h-full items-end pl-2.5">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const activeTicks = Math.min(14, monthlyPdfCount);
                            return (
                              <div
                                key={i}
                                className={`w-[1.5px] rounded-full transition-colors duration-200`}
                                style={{
                                  height: `${20 + (i % 3) * 6}%`,
                                  backgroundColor: i < activeTicks ? '#E05A2B' : '#E8ECF4'
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Ticks Totais: Coloridos Preto/Navy */}
                        <div className="flex space-x-[2px] justify-start h-full items-end pl-2.5">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const activeTicks = Math.min(14, monthlyTotalCount);
                            return (
                              <div
                                key={i}
                                className={`w-[1.5px] rounded-full transition-colors duration-200`}
                                style={{
                                  height: `${20 + (i % 3) * 6}%`,
                                  backgroundColor: i < activeTicks ? '#23273A' : '#E8ECF4'
                                }}
                              />
                            );
                          })}
                        </div>

                      </div>

                    </div>
                  </div>

                  {/* CARD 2: LET'S CONNECT                                   */}
                  <div className="bg-surface rounded-card border border-borderCustom p-6 hover:shadow-cardShadow transition-shadow duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold tracking-tight text-textPrimary">Últimos acessos</h3>
                        <a href="#see-all" className="text-xs font-semibold text-textSecondary hover:text-primary transition-colors">
                          Ver todos
                        </a>
                      </div>

                      {/* Lista de Profissionais Recomendados */}
                      <div className="space-y-4">
                        {professionals.map((prof) => {
                          const isConnected = connectedUsers[prof.id];
                          return (
                            <div key={prof.id} className="flex items-center justify-between p-3 bg-background rounded-[20px] border border-borderCustom/40 hover:bg-[#F4F6FA]/80 transition-colors duration-200 group">

                              {/* Info do Usuário */}
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden border border-borderCustom/60 shadow-sm relative">
                                  <img
                                    src={prof.avatar}
                                    alt={prof.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-xs font-bold text-textPrimary leading-tight">{prof.name}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-badge ${prof.level === 'Sênior'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-[#7FA6D9]/10 text-secondary-hover'
                                      }`}>
                                      {prof.level}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-textSecondary mt-0.5">{prof.specialty}</span>
                                </div>
                              </div>

                              {/* Botão Adicionar / Conectado */}
                              <button
                                onClick={() => toggleConnect(prof.id)}
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 ${isConnected
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-surface border border-borderCustom text-textPrimary hover:bg-primary hover:text-white hover:border-transparent'
                                  }`}
                              >
                                {isConnected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </button>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>

              </section>

              {/* -------------------------------------------------------- */}
              {/* COLUNA DIREITA (30% -> 3 slots do grid)                 */}
              {/* -------------------------------------------------------- */}
              <section className="lg:col-span-3 flex flex-col space-y-8">

                {/* CARD: YOUR RECENT PROJECTS                              */}
                <div className="bg-surface rounded-card border border-borderCustom p-6 hover:shadow-cardShadow transition-shadow duration-300 flex flex-col h-[670px]">

                  <div className="flex-grow flex flex-col min-h-0">
                    {/* Título Card */}
                    <div className="flex justify-between items-center mb-6 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold tracking-tight text-textPrimary">Últimos Clientes cadastrados</h3>
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                          {totalClients}
                        </span>
                      </div>
                    </div>

                    {loadingClients ? (
                      <div className="flex flex-col items-center justify-center py-12 text-textSecondary flex-grow">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-3"></div>
                        <p className="text-xs font-medium">Carregando clientes...</p>
                      </div>
                    ) : lastClients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-textSecondary border border-dashed border-borderCustom/60 rounded-card bg-background/30 flex-grow">
                        <p className="text-xs font-semibold">Nenhum cliente cadastrado</p>
                        <p className="text-[10px] mt-1 text-textSecondary/60">Os novos clientes aparecerão aqui.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-borderCustom/60 rounded-card bg-background/30 overflow-y-auto flex-1 min-h-0 mt-4">
                        {/* Cabeçalho do Grid */}
                        <div className="grid grid-cols-[2fr_1fr] gap-2 bg-[#F4F6FA] border-b border-borderCustom px-4 py-3 text-[10px] font-bold text-textSecondary uppercase tracking-wider">
                          <div>Nome completo</div>
                          <div>WhatsApp</div>
                        </div>
                        {/* Linhas */}
                        <div className="divide-y divide-borderCustom/40">
                          {lastClients.map((client, index) => (
                            <div
                              key={client.id || index}
                              onClick={() => handleEditClientClick(client)}
                              className={`grid grid-cols-[2fr_1fr] gap-2 px-4 py-3.5 items-center hover:bg-[#DCE3EE] transition-colors duration-150 cursor-pointer ${index % 2 === 0 ? 'bg-surface' : 'bg-[#ECEFF6]'
                                }`}
                            >
                              <div className="text-xs font-bold text-textPrimary truncate uppercase" title={client.nome?.toUpperCase()}>
                                {client.nome}
                              </div>
                              <div className="text-xs text-textSecondary font-semibold truncate" title={client.whatsapp}>
                                {formatWhatsapp(client.whatsapp)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão de Rodapé decorativo/ação do card de projetos */}
                  <div className="mt-2 pt-2 border-t border-borderCustom/60 flex flex-col items-center space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowAllClients(!showAllClients)}
                      className="text-xs font-semibold text-textSecondary hover:text-primary underline transition-colors focus:outline-none"
                    >
                      {showAllClients ? 'Ver apenas os últimos 5' : 'Ver todos os Clientes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingClient(null);
                        setClientNome('');
                        setClientEndereco('');
                        setClientWhatsapp('');
                        setClientEmail('');
                        setClientErrors({});
                        setCurrentScreen('cadastro-clientes');
                        setActiveNavItem('Cadastros');
                      }}
                      className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20"
                    >
                      <span>Cadastrar Novo Cliente</span>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                </div>

              </section>

            </motion.main>
          )}

          {currentScreen === 'lista-clientes' && (
            <motion.div
              key="lista-clientes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col space-y-6"
            >
              {/* Seção Superior com Seta de Voltar e Título */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setCurrentScreen('dashboard');
                      setActiveNavItem('Início');
                    }}
                    className="p-3 bg-surface hover:bg-background border border-borderCustom rounded-full transition-all hover:scale-105 active:scale-95 duration-200 shadow-sm text-textSecondary hover:text-textPrimary flex items-center justify-center focus:outline-none"
                    title="Voltar para o Início"
                  >
                    <ArrowLeft className="h-5 w-5 text-primary" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Lista de Clientes</h2>
                    <p className="text-sm text-textSecondary mt-0.5">Gerencie os clientes cadastrados no sistema</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingClient(null);
                    setClientNome('');
                    setClientEndereco('');
                    setClientWhatsapp('');
                    setClientEmail('');
                    setClientErrors({});
                    setCurrentScreen('cadastro-clientes');
                  }}
                  className="w-full sm:w-auto px-6 h-12 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20"
                >
                  <span>Novo Cliente</span>
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Filtro de Busca */}
              <div className="bg-surface rounded-card border border-borderCustom p-5 shadow-cardShadow flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:w-96">
                  <input
                    type="text"
                    value={searchListQuery}
                    onChange={(e) => handleSearchListChange(e.target.value)}
                    placeholder="Buscar por nome ou WhatsApp..."
                    className="w-full h-12 pl-12 pr-4 text-sm bg-background border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm"
                  />
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60 pointer-events-none" />
                  {searchListQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchListChange('')}
                      className="absolute right-4 top-3.5 text-textSecondary hover:text-textPrimary"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="text-xs font-semibold text-textSecondary select-none">
                  Total encontrado: {totalListClients} {totalListClients === 1 ? 'cliente' : 'clientes'}
                </div>
              </div>

              {/* Grid / Tabela de Clientes */}
              <div className="bg-surface rounded-card border border-borderCustom p-6 shadow-cardShadow min-h-[400px] flex flex-col justify-between">
                <div className="flex-grow min-h-0">
                  {loadingListClients ? (
                    <div className="flex flex-col items-center justify-center py-20 text-textSecondary">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                      <p className="text-sm font-medium">Carregando clientes...</p>
                    </div>
                  ) : listClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-textSecondary border border-dashed border-borderCustom/60 rounded-card bg-background/30 w-full">
                      <p className="text-sm font-bold">Nenhum cliente encontrado</p>
                      <p className="text-xs mt-1 text-textSecondary/60">Tente buscar por outro termo ou cadastre um novo cliente.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-borderCustom/60 rounded-card bg-background/30 overflow-x-auto">
                      <table className="w-full text-left border-collapse border-spacing-0">
                        <thead>
                          <tr className="bg-[#F4F6FA] border-b border-borderCustom text-[10px] font-bold text-textSecondary uppercase tracking-wider">
                            <th className="px-6 py-4">Nome completo</th>
                            <th className="px-6 py-4">WhatsApp</th>
                            <th className="px-6 py-4">E-mail</th>
                            <th className="px-6 py-4">Endereço</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCustom/40">
                          {listClients.map((client, index) => (
                            <tr
                              key={client.id || index}
                              onClick={() => handleEditClientClick(client)}
                              className={`hover:bg-[#DCE3EE] transition-colors duration-150 cursor-pointer ${index % 2 === 0 ? 'bg-surface' : 'bg-[#ECEFF6]'
                                }`}
                            >
                              <td className="px-6 py-3.5 text-xs font-bold text-textPrimary uppercase truncate max-w-[200px]" title={client.nome}>
                                {client.nome}
                              </td>
                              <td className="px-6 py-3.5 text-xs font-semibold text-textSecondary truncate">
                                {formatWhatsapp(client.whatsapp)}
                              </td>
                              <td className="px-6 py-3.5 text-xs font-semibold text-textSecondary truncate max-w-[150px]" title={client.email}>
                                {client.email}
                              </td>
                              <td className="px-6 py-3.5 text-xs font-semibold text-textSecondary truncate max-w-[250px]" title={client.endereco || '-'}>
                                {client.endereco || '-'}
                              </td>
                              <td className="px-6 py-3.5 text-xs font-bold text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleEditClientClick(client)}
                                  className="p-2 bg-[#ECEFF6] hover:bg-primary/10 text-textSecondary hover:text-primary rounded-xl transition-all duration-150 focus:outline-none"
                                  title="Editar Cliente"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Paginação */}
                {!loadingListClients && totalListClients > 12 && (() => {
                  const totalPages = Math.max(1, Math.ceil(totalListClients / 12));
                  const getPageNumbers = () => {
                    const pages = [];
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }
                    return pages;
                  };

                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-borderCustom/60 pt-5 mt-6 gap-4">
                      {/* Esquerda: Página X de Y · Z registros */}
                      <div className="text-xs font-semibold text-textSecondary select-none">
                        Página <span className="font-bold text-textPrimary">{currentPage}</span> de <span className="font-bold text-textPrimary">{totalPages}</span> · <span className="text-textSecondary/80">{totalListClients} registros</span>
                      </div>

                      {/* Direita: Botões numéricos de navegação */}
                      <div className="flex items-center space-x-1.5">
                        {/* Botão Anterior (<) */}
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="h-8 w-8 border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 focus:outline-none"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {/* Números das Páginas */}
                        {getPageNumbers().map((pageNumber) => {
                          const isActive = pageNumber === currentPage;
                          return (
                            <button
                              key={pageNumber}
                              type="button"
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`h-8 w-8 text-xs font-bold rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none ${isActive
                                  ? 'bg-primary text-white shadow-sm hover:bg-primary/95 scale-105'
                                  : 'border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary hover:text-textPrimary'
                                }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}

                        {/* Botão Próximo (>) */}
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="h-8 w-8 border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 focus:outline-none"
                          title="Próxima Página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {currentScreen === 'cadastro-clientes' && (
            <motion.div
              key="cadastro-clientes"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {/* Seção Superior com Seta de Voltar e Título */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setEditingClient(null);
                      setClientNome('');
                      setClientEndereco('');
                      setClientWhatsapp('');
                      setClientEmail('');
                      setClientErrors({});
                      setCurrentScreen('lista-clientes');
                    }}
                    className="p-3 bg-surface hover:bg-background border border-borderCustom rounded-full transition-all hover:scale-105 active:scale-95 duration-200 shadow-sm text-textSecondary hover:text-textPrimary flex items-center justify-center focus:outline-none"
                    title="Voltar para o Início"
                  >
                    <ArrowLeft className="h-5 w-5 text-primary" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-textPrimary">
                      {editingClient ? 'Editar Cliente' : 'Cadastro de Clientes'}
                    </h2>
                    <p className="text-sm text-textSecondary mt-0.5">
                      {editingClient
                        ? 'Atualize as informações do cliente selecionado'
                        : 'Preencha as informações para registrar o novo cliente'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card do Formulário */}
              <div className="bg-surface rounded-card border border-borderCustom p-6 md:p-8 shadow-cardShadow relative overflow-hidden">

                {/* Alerta de Sucesso */}
                <AnimatePresence>
                  {clientSuccess && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-center space-x-3 text-green-700 overflow-hidden"
                    >
                      <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Check className="h-4.5 w-4.5 stroke-[3]" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!'}
                        </p>
                        <p className="text-xs text-green-700/80">Os dados foram armazenados no Supabase.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Alerta de Erro de Banco */}
                <AnimatePresence>
                  {clientErrors.dbError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-center space-x-3 text-red-700 overflow-hidden"
                    >
                      <div className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="font-bold font-sans">!</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">Erro ao salvar no banco de dados</p>
                        <p className="text-xs text-red-700/80">{clientErrors.dbError}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSaveClient} className="space-y-6">

                  {/* Nome Completo */}
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="client-nome" className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      Nome Completo <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="client-nome"
                        type="text"
                        value={clientNome}
                        onChange={(e) => setClientNome(e.target.value)}
                        placeholder="Ex: João Silva de Souza"
                        className={`w-full h-12 px-5 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${clientErrors.nome ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                          }`}
                      />
                    </div>
                    {clientErrors.nome && (
                      <span className="text-xs text-red-500 font-medium pl-1">{clientErrors.nome}</span>
                    )}
                  </div>

                  {/* Endereço */}
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="client-endereco" className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                      Endereço
                    </label>
                    <div className="relative">
                      <input
                        id="client-endereco"
                        type="text"
                        value={clientEndereco}
                        onChange={(e) => setClientEndereco(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123 - Centro"
                        className="w-full h-12 px-5 text-sm bg-background border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* WhatsApp */}
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="client-whatsapp" className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                        WhatsApp <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="client-whatsapp"
                          type="tel"
                          value={clientWhatsapp}
                          onChange={handleWhatsappChange}
                          placeholder="Ex: (11) 99999-9999"
                          className={`w-full h-12 px-5 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${clientErrors.whatsapp ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                            }`}
                        />
                      </div>
                      {clientErrors.whatsapp && (
                        <span className="text-xs text-red-500 font-medium pl-1">{clientErrors.whatsapp}</span>
                      )}
                    </div>

                    {/* E-mail */}
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="client-email" className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                        E-mail <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="client-email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="Ex: joao.silva@email.com"
                          className={`w-full h-12 px-5 text-sm bg-background border rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm ${clientErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-borderCustom'
                            }`}
                        />
                      </div>
                      {clientErrors.email && (
                        <span className="text-xs text-red-500 font-medium pl-1">{clientErrors.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-4 border-t border-borderCustom flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={clientSaving}
                      onClick={() => {
                        setEditingClient(null);
                        setClientNome('');
                        setClientEndereco('');
                        setClientWhatsapp('');
                        setClientEmail('');
                        setClientErrors({});
                        setCurrentScreen('lista-clientes');
                      }}
                      className="w-full sm:w-auto px-6 h-12 border border-borderCustom hover:bg-background text-textSecondary hover:text-textPrimary font-bold text-sm rounded-btn transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={clientSaving}
                      className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary-hover disabled:bg-disabledCustom disabled:cursor-not-allowed text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center space-x-2"
                    >
                      <span>
                        {clientSaving
                          ? 'Salvando...'
                          : editingClient
                            ? 'Salvar Alterações'
                            : 'Salvar Cliente'}
                      </span>
                      {!clientSaving && <Check className="h-4.5 w-4.5" />}
                    </button>
                  </div>

                </form>

              </div>
            </motion.div>
          )}

          {currentScreen === 'importar-nf-xml' && (
            <motion.div
              key="importar-nf-xml"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {importSubScreen === 'list' ? (
                <div className="w-full flex flex-col space-y-6">
                  {/* Seção Superior com Seta de Voltar e Título */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentScreen('dashboard');
                          setActiveNavItem('Início');
                        }}
                        className="p-3 bg-surface hover:bg-background border border-borderCustom rounded-full transition-all hover:scale-105 active:scale-95 duration-200 shadow-sm text-textSecondary hover:text-textPrimary flex items-center justify-center focus:outline-none"
                        title="Voltar para o Início"
                      >
                        <ArrowLeft className="h-5 w-5 text-primary" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Clientes com Envios</h2>
                        <p className="text-sm text-textSecondary mt-0.5">Selecione um cliente para gerenciar suas importações e envios</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedClientId('');
                        setClientSearchTerm('');
                        setImportSubScreen('form');
                      }}
                      className="w-full sm:w-auto px-6 h-12 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/20"
                    >
                      <span>Novas Importações</span>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Filtro de Busca */}
                  <div className="bg-surface rounded-card border border-borderCustom p-5 shadow-cardShadow flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:w-96">
                      <input
                        type="text"
                        value={searchClientWithSubmissions}
                        onChange={(e) => handleSearchClientWithSubmissionsChange(e.target.value)}
                        placeholder="Buscar cliente por nome..."
                        className="w-full h-12 pl-12 pr-4 text-sm bg-background border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm"
                      />
                      <Search className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60 pointer-events-none" />
                      {searchClientWithSubmissions && (
                        <button
                          type="button"
                          onClick={() => handleSearchClientWithSubmissionsChange('')}
                          className="absolute right-4 top-3.5 text-textSecondary hover:text-textPrimary"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-textSecondary select-none">
                      Total encontrado: {totalImportClientsCount} {totalImportClientsCount === 1 ? 'cliente' : 'clientes'}
                    </div>
                  </div>

                  {/* Grid / Tabela de Clientes com Envios */}
                  <div className="bg-surface rounded-card border border-borderCustom p-6 shadow-cardShadow min-h-[350px] flex flex-col justify-between">
                    <div className="flex-grow min-h-0">
                      {loadingClientsWithSubmissions ? (
                        <div className="flex flex-col items-center justify-center py-20 text-textSecondary">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3 text-primary"></div>
                          <p className="text-sm font-medium">Carregando clientes com envios...</p>
                        </div>
                      ) : clientsWithSubmissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-textSecondary border border-dashed border-borderCustom/60 rounded-card bg-background/30 w-full">
                          <p className="text-sm font-bold">Nenhum cliente com envios encontrado</p>
                          <p className="text-xs mt-1 text-textSecondary/60">
                            {searchClientWithSubmissions
                              ? 'Tente buscar por outro nome ou realize uma nova importação.'
                              : 'Realize a primeira importação clicando no botão "Novas Importações".'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden border border-borderCustom/60 rounded-card bg-background/30 overflow-x-auto">
                          <table className="w-full text-left border-collapse border-spacing-0">
                            <thead>
                              <tr className="bg-[#F4F6FA] border-b border-borderCustom text-[10px] font-bold text-textSecondary uppercase tracking-wider">
                                <th className="px-6 py-4">Nome completo</th>
                                <th className="px-6 py-4">WhatsApp</th>
                                <th className="px-6 py-4">E-mail</th>
                                <th className="px-6 py-4 text-center">Arquivos Importados</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-borderCustom/40">
                              {clientsWithSubmissions.map((client, index) => (
                                <tr
                                  key={client.id || index}
                                  onClick={() => {
                                    setSelectedClientId(client.id);
                                    setClientSearchTerm(client.nome.toUpperCase());
                                    setImportSubScreen('form');
                                  }}
                                  className={`hover:bg-[#DCE3EE] transition-colors duration-150 cursor-pointer ${index % 2 === 0 ? 'bg-surface' : 'bg-[#ECEFF6]'
                                    }`}
                                >
                                  <td className="px-6 py-3.5 text-xs font-bold text-textPrimary uppercase truncate max-w-[200px]" title={client.nome}>
                                    {client.nome}
                                  </td>
                                  <td className="px-6 py-3.5 text-xs font-semibold text-textSecondary truncate">
                                    {formatWhatsapp(client.whatsapp)}
                                  </td>
                                  <td className="px-6 py-3.5 text-xs font-semibold text-textSecondary truncate max-w-[150px]" title={client.email}>
                                    {client.email}
                                  </td>
                                  <td className="px-6 py-3.5 text-xs font-bold text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      {(() => {
                                        const xmlCount = client.arquivos_importados
                                          ? client.arquivos_importados.filter((f: any) => f.tipo_arquivo === 'xml').length
                                          : 0;
                                        const pdfCount = client.arquivos_importados
                                          ? client.arquivos_importados.filter((f: any) => f.tipo_arquivo === 'pdf').length
                                          : 0;
                                        return (
                                          <>
                                            {xmlCount > 0 && (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                {xmlCount} XML
                                              </span>
                                            )}
                                            {pdfCount > 0 && (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                                                {pdfCount} PDF
                                              </span>
                                            )}
                                            {xmlCount === 0 && pdfCount === 0 && (
                                              <span className="text-textSecondary/40 font-normal">-</span>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Paginação */}
                    {!loadingClientsWithSubmissions && totalImportClientsCount > 12 && (() => {
                      const totalPages = Math.max(1, Math.ceil(totalImportClientsCount / 12));
                      const getPageNumbers = () => {
                        const pages = [];
                        let startPage = Math.max(1, importClientsPage - 2);
                        let endPage = Math.min(totalPages, startPage + 4);
                        if (endPage - startPage < 4) {
                          startPage = Math.max(1, endPage - 4);
                        }
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(i);
                        }
                        return pages;
                      };

                      return (
                        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-borderCustom/60 pt-5 mt-6 gap-4">
                          {/* Esquerda: Página X de Y · Z registros */}
                          <div className="text-xs font-semibold text-textSecondary select-none">
                            Página <span className="font-bold text-textPrimary">{importClientsPage}</span> de <span className="font-bold text-textPrimary">{totalPages}</span> · <span className="text-textSecondary/80">{totalImportClientsCount} registros</span>
                          </div>

                          {/* Direita: Botões numéricos de navegação */}
                          <div className="flex items-center space-x-1.5">
                            {/* Botão Anterior (<) */}
                            <button
                              type="button"
                              disabled={importClientsPage === 1}
                              onClick={() => setImportClientsPage(prev => Math.max(prev - 1, 1))}
                              className="h-8 w-8 border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 focus:outline-none"
                              title="Página Anterior"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>

                            {/* Números das Páginas */}
                            {getPageNumbers().map((pageNumber) => {
                              const isActive = pageNumber === importClientsPage;
                              return (
                                <button
                                  key={pageNumber}
                                  type="button"
                                  onClick={() => setImportClientsPage(pageNumber)}
                                  className={`h-8 w-8 text-xs font-bold rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none ${isActive
                                      ? 'bg-primary text-white shadow-sm hover:bg-primary/95 scale-105'
                                      : 'border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary hover:text-textPrimary'
                                    }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}

                            {/* Botão Próximo (>) */}
                            <button
                              type="button"
                              disabled={importClientsPage === totalPages}
                              onClick={() => setImportClientsPage(prev => Math.min(prev + 1, totalPages))}
                              className="h-8 w-8 border border-borderCustom bg-surface hover:bg-[#F4F6FA] text-textSecondary disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors duration-150 focus:outline-none"
                              title="Próxima Página"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  {/* Seção Superior com Seta de Voltar e Título */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setImportSubScreen('list');
                        }}
                        className="p-3 bg-surface hover:bg-background border border-borderCustom rounded-full transition-all hover:scale-105 active:scale-95 duration-200 shadow-sm text-textSecondary hover:text-textPrimary flex items-center justify-center focus:outline-none"
                        title="Voltar para a lista de clientes"
                      >
                        <ArrowLeft className="h-5 w-5 text-primary" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight text-textPrimary">
                          Importação de NF e XML
                        </h2>
                        <p className="text-sm text-textSecondary mt-0.5">
                          Importe arquivos do tipo XML ou PDF vinculados a um cliente específico
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Card do Formulário de Importação */}
                    <div className="lg:col-span-5 bg-surface rounded-card border border-borderCustom p-6 md:p-8 shadow-cardShadow relative overflow-hidden">

                      {/* Alerta de Sucesso */}
                      <AnimatePresence>
                        {importSuccess && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-center space-x-3 text-green-700 overflow-hidden"
                          >
                            <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                              <Check className="h-4.5 w-4.5 stroke-[3]" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{importSuccessMessage}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Alerta de Erro */}
                      <AnimatePresence>
                        {importError && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-center space-x-3 text-red-700 overflow-hidden"
                          >
                            <div className="h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                              <span className="font-bold font-sans">!</span>
                            </div>
                            <div>
                              <p className="font-bold text-sm">Erro na importação</p>
                              <p className="text-xs text-red-700/80">{importError}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <form onSubmit={handleImportFileSubmit} className="space-y-6">
                        {/* Seleção do Cliente (Autocomplete Combobox) */}
                        <div className="flex flex-col space-y-2 relative">
                          <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                            Cliente <span className="text-primary">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={clientSearchTerm}
                              onChange={(e) => {
                                setClientSearchTerm(e.target.value);
                                setShowClientSuggestions(true);
                                if (!e.target.value) {
                                  setSelectedClientId('');
                                }
                              }}
                              onFocus={() => setShowClientSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                              placeholder="Pesquise por nome do cliente..."
                              className="w-full h-12 px-5 text-sm bg-background border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm"
                            />
                            <Search className="absolute right-4 top-3.5 h-5 w-5 text-textSecondary/60 pointer-events-none" />

                            {selectedClientId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClientId('');
                                  setClientSearchTerm('');
                                }}
                                className="absolute right-12 top-3.5 text-textSecondary hover:text-textPrimary"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>

                          {/* Lista Suspeita Autocomplete */}
                          {showClientSuggestions && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-borderCustom rounded-card shadow-dropdownShadow z-30 max-h-60 overflow-y-auto p-2">
                              {importClients.filter(c =>
                                c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase())
                              ).length === 0 ? (
                                <div className="px-4 py-3 text-xs text-textSecondary text-center">
                                  Nenhum cliente encontrado
                                </div>
                              ) : (
                                importClients
                                  .filter(c => c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                  .map((client) => (
                                    <button
                                      key={client.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedClientId(client.id);
                                        setClientSearchTerm(client.nome.toUpperCase());
                                        setShowClientSuggestions(false);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-colors font-medium flex items-center justify-between ${selectedClientId === client.id
                                          ? 'bg-primary/10 text-primary'
                                          : 'text-textSecondary hover:text-textPrimary hover:bg-background'
                                        }`}
                                    >
                                      <span className="uppercase">{client.nome}</span>
                                      {selectedClientId === client.id && <Check className="h-4.5 w-4.5" />}
                                    </button>
                                  ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Campo de Upload de Arquivo */}
                        <div className="flex flex-col space-y-2">
                          <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                            Arquivo (XML ou PDF) <span className="text-primary">*</span>
                          </label>

                          {/* Drag and Drop Zone */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragActive(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                setImportFile(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-card p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer min-h-[180px] ${dragActive
                                ? 'border-primary bg-primary/5 shadow-inner'
                                : importFile
                                  ? 'border-green-500/40 bg-green-500/5'
                                  : 'border-borderCustom hover:border-primary/50 hover:bg-primary/5'
                              }`}
                          >
                            <input
                              type="file"
                              id="file-upload-input"
                              accept=".xml,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setImportFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            <label htmlFor="file-upload-input" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                              {importFile ? (
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
                                    {importFile.name.split('.').pop()?.toLowerCase() === 'xml' ? (
                                      <FileCode className="h-8 w-8" />
                                    ) : (
                                      <FileText className="h-8 w-8" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-textPrimary max-w-md truncate px-4">
                                      {importFile.name}
                                    </p>
                                    <p className="text-xs text-textSecondary mt-1">
                                      {formatFileSize(importFile.size)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setImportFile(null);
                                    }}
                                    className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-btn text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Remover arquivo</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="h-14 w-14 rounded-2xl bg-background border border-borderCustom flex items-center justify-center text-textSecondary/60 shadow-sm">
                                    <UploadCloud className="h-7 w-7 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-textPrimary">
                                      Arraste e solte o arquivo aqui
                                    </p>
                                    <p className="text-xs text-textSecondary mt-1">
                                      ou clique para selecionar do seu computador
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-textSecondary bg-background px-3 py-1 rounded-badge border border-borderCustom/60 font-semibold uppercase tracking-wider font-sans">
                                    XML ou PDF • Máximo 10MB
                                  </span>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Botão de Enviar */}
                        <div className="pt-4 border-t border-borderCustom flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={importing || !selectedClientId || !importFile}
                            className="w-full sm:w-auto px-8 h-12 bg-primary hover:bg-primary-hover disabled:bg-disabledCustom disabled:cursor-not-allowed text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-md shadow-primary/20 flex items-center justify-center space-x-2"
                          >
                            {importing ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Importando Arquivo...</span>
                              </>
                            ) : (
                              <>
                                <span>Importar Arquivo</span>
                                <Check className="h-4.5 w-4.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Grid de Histórico de Arquivos */}
                    <div className="lg:col-span-7 bg-surface rounded-card border border-borderCustom p-6 md:p-8 shadow-cardShadow flex flex-col">
                      <div className="mb-6">
                        <h3 className="text-lg font-bold tracking-tight text-textPrimary">
                          Histórico de Arquivos Importados
                        </h3>
                        <p className="text-xs text-textSecondary mt-0.5">
                          Visualize e gerencie os documentos que já foram importados do cliente selecionado
                        </p>
                      </div>

                      {!selectedClientId ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-textSecondary border border-dashed border-borderCustom/60 rounded-card bg-background/30">
                          <div className="h-12 w-12 rounded-full bg-background border border-borderCustom/60 flex items-center justify-center text-textSecondary/50 mb-3 shadow-sm">
                            <File className="h-6 w-6" />
                          </div>
                          <p className="text-xs font-semibold">Nenhum cliente selecionado</p>
                          <p className="text-[10px] mt-1 text-textSecondary/60">Selecione um cliente no formulário acima para listar seus arquivos.</p>
                        </div>
                      ) : loadingImportedFiles ? (
                        <div className="flex flex-col items-center justify-center py-12 text-textSecondary">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                          <p className="text-xs font-medium">Carregando histórico de arquivos...</p>
                        </div>
                      ) : importedFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-textSecondary border border-dashed border-borderCustom/60 rounded-card bg-background/30">
                          <div className="h-12 w-12 rounded-full bg-background border border-borderCustom/60 flex items-center justify-center text-textSecondary/50 mb-3 shadow-sm">
                            <File className="h-6 w-6" />
                          </div>
                          <p className="text-xs font-semibold">Nenhum arquivo importado para este cliente</p>
                          <p className="text-[10px] mt-1 text-textSecondary/60">Os novos arquivos importados aparecerão neste grid.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden border border-borderCustom/60 rounded-card bg-background/30 overflow-y-auto max-h-[400px]">
                          {/* Cabeçalho da Tabela */}
                          <div className="grid grid-cols-[2fr_0.8fr_0.8fr_1.2fr_2fr_1.2fr] gap-2 bg-[#F4F6FA] border-b border-borderCustom px-4 py-3 text-[10px] font-bold text-textSecondary uppercase tracking-wider">
                            <div>Nome do Arquivo</div>
                            <div>Tipo</div>
                            <div>Tamanho</div>
                            <div>Importação</div>
                            <div>Envios</div>
                            <div className="text-right">Ações</div>
                          </div>

                          {/* Lista de Arquivos */}
                          <div className="divide-y divide-borderCustom/40">
                            {importedFiles.map((file, index) => (
                              <div
                                key={file.id}
                                className={`grid grid-cols-[2fr_0.8fr_0.8fr_1.2fr_2fr_1.2fr] gap-2 px-4 py-3.5 items-center hover:bg-[#DCE3EE] transition-colors duration-150 ${index % 2 === 0 ? 'bg-surface' : 'bg-[#ECEFF6]'
                                  }`}
                              >
                                {/* Nome */}
                                <div className="text-xs font-bold text-textPrimary truncate" title={file.nome_arquivo}>
                                  {file.nome_arquivo}
                                </div>

                                {/* Tipo */}
                                <div className="text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-[10px] font-bold ${file.tipo_arquivo === 'xml'
                                      ? 'bg-blue-500/10 text-blue-600'
                                      : 'bg-red-500/10 text-red-600'
                                    }`}>
                                    {file.tipo_arquivo.toUpperCase()}
                                  </span>
                                </div>

                                {/* Tamanho */}
                                <div className="text-xs text-textSecondary font-semibold">
                                  {formatFileSize(file.tamanho_arquivo)}
                                </div>

                                {/* Data */}
                                <div className="text-xs text-textSecondary font-medium">
                                  {formatImportDate(file.created_at)}
                                </div>

                                {/* Envios */}
                                <div className="text-xs flex flex-col space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] text-textSecondary font-semibold">E-mail:</span>
                                    <span className={file.enviado_email_at ? "text-green-600 font-medium" : "text-textSecondary/50 font-normal"}>
                                      {file.enviado_email_at ? formatImportDate(file.enviado_email_at) : 'Não enviado'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] text-textSecondary font-semibold">Whats:</span>
                                    <span className={file.enviado_whatsapp_at ? "text-green-600 font-medium" : "text-textSecondary/50 font-normal"}>
                                      {file.enviado_whatsapp_at ? formatImportDate(file.enviado_whatsapp_at) : 'Não enviado'}
                                    </span>
                                  </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(file.caminho_storage, file.nome_arquivo)}
                                    className="p-2 bg-surface hover:bg-background border border-borderCustom rounded-full text-textSecondary hover:text-primary transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                                    title="Baixar Arquivo"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sendingEmailId === file.id || sendingWhatsappId === file.id}
                                    onClick={() => handleSendEmail(file)}
                                    className="p-2 bg-surface hover:bg-background border border-borderCustom rounded-full text-textSecondary hover:text-primary transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Enviar por E-mail"
                                  >
                                    {sendingEmailId === file.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sendingEmailId === file.id || sendingWhatsappId === file.id}
                                    onClick={() => handleSendWhatsapp(file)}
                                    className="p-2 bg-surface hover:bg-background border border-borderCustom rounded-full text-textSecondary hover:text-primary transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Enviar por WhatsApp"
                                  >
                                    {sendingWhatsappId === file.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImportedFile(file.id, file.caminho_storage)}
                                    className="p-2 bg-surface hover:bg-red-50 border border-borderCustom hover:border-red-200 rounded-full text-textSecondary hover:text-red-500 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
                                    title="Excluir Arquivo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Modal de Confirmação de Saída (Logout) */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-[#1e2235]/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-surface border border-borderCustom rounded-[30px] shadow-dropdownShadow p-6 md:p-8 flex flex-col items-center text-center z-10"
            >
              {/* Alert / Warning Icon */}
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100/50 mb-5">
                <LogOut className="h-7 w-7 stroke-[2.2]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold tracking-tight text-textPrimary mb-2">
                Sair do Sistema
              </h3>

              {/* Message */}
              <p className="text-sm text-textSecondary leading-relaxed mb-6">
                Tem certeza que deseja sair? Você precisará fazer login novamente para acessar seus dados.
              </p>

              {/* Action Buttons */}
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 h-12 bg-background hover:bg-slate-50 border border-borderCustom text-textSecondary hover:text-textPrimary font-semibold text-sm rounded-btn transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLogoutModal(false);
                    await supabase.auth.signOut();
                  }}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-red-500/10"
                >
                  Sim, Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição de Perfil de Usuário */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              onClick={() => {
                if (!savingProfile) setShowProfileModal(false);
              }}
              className="absolute inset-0 bg-[#1e2235]/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-surface border border-borderCustom rounded-[30px] shadow-dropdownShadow p-6 md:p-8 flex flex-col z-10"
            >
              {/* Botão Fechar */}
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                disabled={savingProfile}
                className="absolute right-5 top-5 p-2 bg-background hover:bg-slate-100 rounded-full text-textSecondary hover:text-textPrimary transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Título */}
              <h3 className="text-xl font-bold tracking-tight text-textPrimary mb-6">
                Editar Perfil
              </h3>

              {/* Formulário */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Imagem do Perfil e Upload */}
                <div className="flex flex-col items-center space-y-2 pb-2">
                  <div className="relative group cursor-pointer h-24 w-24 rounded-full overflow-hidden border-2 border-borderCustom hover:border-primary transition-all shadow-sm">
                    <img
                      src={profileImageUrl}
                      alt="Preview da foto de perfil"
                      className="h-full w-full object-cover"
                    />
                    <label 
                      htmlFor="profile-image-upload" 
                      className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </label>
                  </div>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={savingProfile}
                    className="hidden"
                  />
                  <span className="text-xs text-textSecondary font-semibold">
                    Clique para trocar de imagem
                  </span>
                </div>

                {/* Nome Completo */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-textPrimary uppercase tracking-wider pl-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Seu nome completo"
                      disabled={savingProfile}
                      className="w-full h-12 pl-12 pr-4 text-sm bg-background border border-borderCustom rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 placeholder:text-textSecondary/40 shadow-sm disabled:opacity-60"
                    />
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/60" />
                  </div>
                </div>

                {/* Email (Apenas Leitura) */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-textSecondary uppercase tracking-wider pl-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={session?.user?.email || ''}
                      disabled
                      className="w-full h-12 pl-12 pr-4 text-sm bg-background/50 border border-borderCustom rounded-input text-textSecondary cursor-not-allowed shadow-sm"
                    />
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-textSecondary/40" />
                  </div>
                </div>

                {/* Alertas de Erro/Sucesso */}
                {profileError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-red-700 text-xs">
                    <span className="font-medium leading-normal">{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-[20px] p-4 flex items-start space-x-3 text-green-700 text-xs">
                    <span className="font-medium leading-normal">Perfil atualizado com sucesso!</span>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex w-full gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    disabled={savingProfile}
                    className="flex-1 h-12 bg-background hover:bg-slate-50 border border-borderCustom text-textSecondary hover:text-textPrimary font-semibold text-sm rounded-btn transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 h-12 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-btn transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-md shadow-primary/10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;