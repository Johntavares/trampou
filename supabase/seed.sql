-- ==============================================================================
-- PROJETO: GO Parauapebas
-- SCRIPT: seed.sql
-- DESCRIÇÃO: Dados iniciais de categorias e contexto local de Parauapebas/PA
-- ==============================================================================

-- Categorias de Serviços Populares em Parauapebas
INSERT INTO public.categories (name, slug, description, icon_name) VALUES
('Manutenção de Ar-Condicionado', 'ar-condicionado', 'Instalação, limpeza e conserto de Split e AC residencial/comercial', 'Wind'),
('Eletricista Residencial e Predial', 'eletricista', 'Instalações elétricas, quadros de força, fiação e iluminação', 'Zap'),
('Encanador e Bombeiro Hidráulico', 'encanador', 'Desentupimentos, vazamentos, bombas e encanamentos em geral', 'Droplets'),
('Pedreiro e Reformas', 'pedreiro', 'Construção civil, alvenaria, pisos, contrapiso e reformas gerais', 'Hammer'),
('Pintor', 'pintor', 'Pintura residencial, predial, textura e emassamento', 'Paintbrush'),
('Diarista e Faxina Residencial', 'diarista', 'Limpeza pesada, faxina diária, semanal e pós-obra', 'Sparkles'),
('Mecânica e Auto Socorro', 'mecanico', 'Manutenção mecânica automotiva, revisão e guincho local', 'Wrench'),
('Técnico em Informática e Celulares', 'informatica', 'Formatação, conserto de notebooks, PCs e troca de tela de celulares', 'Laptop'),
('Fretes e Carretos', 'fretes', 'Transporte de cargas, mudanças e carretos rápidos em Parauapebas e região', 'Truck'),
('Marceneiro e Móveis Planejados', 'marceneiro', 'Montagem, conserto e criação de móveis sob medida', 'Box'),
('Manicure, Cabelo e Estética', 'beleza-estetica', 'Atendimento a domicílio de manicure, pedicure, sobrancelhas e corte', 'Scissors'),
('Jardinagem e Limpeza de Lotes', 'jardinagem', 'Roçagem, poda de árvores, paisagismo e limpeza de terrenos', 'Shovel')
ON CONFLICT (slug) DO NOTHING;
